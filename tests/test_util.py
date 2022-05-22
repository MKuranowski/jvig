from jvig import util
from jinja2 import Undefined


def test_time_to_int():
    assert util.time_to_int("10:40:30") == 38430
    assert util.time_to_int("8:00:00") == 28800
    assert util.time_to_int("08:00:00") == 28800
    assert util.time_to_int("26:30:00") == 95400
    assert util.time_to_int("8:20") == -1
    assert util.time_to_int("8") == -1
    assert util.time_to_int("") == -1
    assert util.time_to_int("foo") == -1
    assert util.time_to_int("foo:bar:baz") == -1


def test_sequence_to_int():
    assert util.sequence_to_int("1") == 1
    assert util.sequence_to_int("0") == 0
    assert util.sequence_to_int("454565649") == 454565649
    assert util.sequence_to_int("-5") < 0
    assert util.sequence_to_int("") < 0
    assert util.sequence_to_int("foo") < 0


def test_to_js_literal():
    assert util.to_js_literal(None) == "null"
    assert util.to_js_literal(Undefined()) == "undefined"

    assert util.to_js_literal("") == "''"
    assert util.to_js_literal("foo") == "'foo'"
    assert util.to_js_literal('"foo"') == '\'"foo"\''
    assert util.to_js_literal('"foo";alert(1)') == '\'"foo";alert(1)\''

    assert util.to_js_literal(0) == "0"
    assert util.to_js_literal(-2) == "-2"
    assert util.to_js_literal(14564532132) == "14564532132"
    assert util.to_js_literal(-9999999999) == "-9999999999"