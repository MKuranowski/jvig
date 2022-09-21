from jinja2 import is_undefined
from typing import Any, Hashable, Iterable, TypeVar

T = TypeVar("T")
THashable = TypeVar("THashable", bound=Hashable)


def time_to_int(time: str) -> int:
    try:
        h, m, s = map(int, time.split(":"))
        return h*3600 + m*60 + s
    except ValueError:
        return -1


def sequence_to_int(text: str) -> int:
    try:
        return int(text)
    except ValueError:
        return -1


def to_js_literal(obj: Any) -> str:
    if obj is None:
        return "null"

    elif is_undefined(obj):
        return "undefined"

    elif isinstance(obj, str):
        # FIXME: Figure out if this is actually a safe way to pass a string to JS
        return repr(obj)

    elif isinstance(obj, int):
        return str(obj)

    else:
        raise ValueError(f"Unsupported conversion to JS literal from {type(obj).__name__}")


def unique_list(it: Iterable[THashable]) -> list[THashable]:
    """Similar to `list(it)`, except that duplicate entries are removed.
    In other words, similar to `list(set(it))`, except that order of elements is preserved.
    """
    seen: set[THashable] = set()
    lst: list[THashable] = []

    for i in it:
        if i not in seen:
            seen.add(i)
            lst.append(i)

    return lst
