"""For each fixture: every {path: "..."} reference resolves against the data.

This gate catches the path-vs-data-shape class of bug where a Python
_build_data emits, say, ``{"projects": [...]}`` but the catalog JSON binds
``{path: "projectList"}``. The renderer silently shows nothing; the bug is
only visible at runtime.

Walks the component tree carrying a data scope:
- Bare ``{"path": "foo"}`` resolves against the current scope.
- Template binding ``{"componentId": "X", "path": "/foo"}`` mounts an array
  at ``foo`` and any descendants of component ``X`` resolve against an
  *item* of that array (we probe the first element).
- Child string references (``"children": ["card-id", ...]``) look the
  referenced component up by id and inherit the current scope.

Run from the agent/ directory:

    uv run python -m pytest tests/test_schema_data_alignment.py -v
"""

from __future__ import annotations

import glob
import json
from pathlib import Path

import pytest

WIDGETS_DIR = Path(__file__).parent.parent / "src" / "widgets"


def _resolve_path(data, path: str):
    """Walk a dotted path against ``data``. Return (found, value)."""
    if path is None:
        return False, None
    # Strip the leading "/" used for top-level array bindings.
    if path.startswith("/"):
        path = path[1:]
    if path == "":
        return True, data
    cur = data
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return False, None
    return True, cur


def _walk(component, components_by_id, scope, unresolved, seen=None):
    """Recurse the component tree, validating every path reference.

    Parameters
    ----------
    component : dict
        The component to walk.
    components_by_id : dict[str, dict]
        All components flattened by ``id`` so child string refs can be
        looked up.
    scope : Any
        The current data scope. Top-level starts as ``fixture["data"]``;
        template bindings switch scope to the first element of the bound
        array.
    unresolved : list
        Accumulator for ``(component_id, path)`` pairs that fail to
        resolve in the current scope.
    seen : set
        Already-visited component ids; prevents infinite loops on
        self-referential template bindings.
    """
    if seen is None:
        seen = set()
    cid = component.get("id")
    if cid in seen:
        return
    seen = seen | {cid}

    for key, val in component.items():
        if key in ("id", "component"):
            continue
        _walk_value(cid, key, val, components_by_id, scope, unresolved, seen)


def _walk_value(cid, key, val, components_by_id, scope, unresolved, seen):
    """Recurse into a single property of a component."""
    if isinstance(val, dict):
        # Case A: template binding, e.g. children = {componentId, path}.
        if (
            "componentId" in val
            and "path" in val
            and isinstance(val.get("path"), str)
        ):
            template_path = val["path"]
            child_id = val["componentId"]
            found, array_val = _resolve_path(scope, template_path)
            if not found:
                unresolved.append(
                    (cid, f"template:{template_path} (key={key})")
                )
                return
            # The bound value should be a list; probe its first element.
            if isinstance(array_val, list) and array_val:
                child = components_by_id.get(child_id)
                if child is not None:
                    _walk(child, components_by_id, array_val[0], unresolved, seen)
            return

        # Case B: bare value binding {"path": "..."} (single key).
        if list(val.keys()) == ["path"] and isinstance(val.get("path"), str):
            value_path = val["path"]
            found, _ = _resolve_path(scope, value_path)
            if not found:
                unresolved.append((cid, f"value:{value_path} (key={key})"))
            return

        # Generic dict — recurse into every value.
        for sub in val.values():
            _walk_value(cid, key, sub, components_by_id, scope, unresolved, seen)
        return

    if isinstance(val, list):
        # Heuristic: "children" lists hold string IDs of sibling components.
        if key == "children" and all(isinstance(x, str) for x in val):
            for child_id in val:
                child = components_by_id.get(child_id)
                if child is not None:
                    _walk(child, components_by_id, scope, unresolved, seen)
            return
        for sub in val:
            _walk_value(cid, key, sub, components_by_id, scope, unresolved, seen)
        return

    # Strings/ints/booleans inside non-children lists may be component-id
    # references (e.g. ``"child": "kpi-active-m"``). Try to resolve them.
    if isinstance(val, str) and key in ("child",):
        child = components_by_id.get(val)
        if child is not None:
            _walk(child, components_by_id, scope, unresolved, seen)


FIXTURE_FILES = sorted(glob.glob(str(WIDGETS_DIR / "**" / "*.fixture.json"), recursive=True))


@pytest.mark.parametrize(
    "fixture_path",
    FIXTURE_FILES,
    ids=[str(Path(p).relative_to(WIDGETS_DIR)) for p in FIXTURE_FILES],
)
def test_schema_data_alignment(fixture_path):
    """Every {path: "..."} in the fixture's component tree must resolve."""
    with open(fixture_path) as f:
        fixture = json.load(f)

    components = fixture.get("components", [])
    data = fixture.get("data", {})

    # Index components by id.
    components_by_id = {
        c["id"]: c for c in components if isinstance(c, dict) and "id" in c
    }

    # Convention: the tree's entry point is the component with id="root".
    root = components_by_id.get("root")
    if root is None:
        # Some legacy fixtures might use a different root id. Fall back to
        # the first component in the list.
        if not components:
            pytest.skip(f"{fixture_path}: no components to walk")
        root = components[0]

    unresolved: list[tuple[str, str]] = []
    _walk(root, components_by_id, data, unresolved)

    if unresolved:
        msg = f"Unresolved paths in {Path(fixture_path).name}:\n"
        for cid, path in unresolved:
            msg += f"  - component '{cid}': {path}\n"
        pytest.fail(msg)
