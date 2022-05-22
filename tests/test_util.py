from jvig import util


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
