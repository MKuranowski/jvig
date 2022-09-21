from jvig import valid


def test_color():
    assert valid.color("FFFFFF")
    assert valid.color("bb0000")
    assert valid.color("")
    assert not valid.color("red")
    assert not valid.color("000")


def test_latitude():
    assert valid.latitude("52.14") == 52.14
    assert valid.latitude("-60") == -60.0
    assert valid.latitude("120.15") is None
    assert valid.latitude("") is None
    assert valid.latitude("foo") is None


def test_longitude():
    assert valid.longitude("52.14") == 52.14
    assert valid.longitude("-60") == -60.0
    assert valid.longitude("120.15") == 120.15
    assert valid.longitude("240.8") is None
    assert valid.longitude("") is None
    assert valid.longitude("foo") is None


def test_time():
    assert valid.time("8:20:40")
    assert valid.time("08:20:40")
    assert valid.time("26:00:00")
    assert not valid.time("8:20")
    assert not valid.time("8:0:0")
    assert not valid.time("foo")
    assert not valid.time("")


def test_non_negative_float():
    assert valid.non_negative_float("0")
    assert valid.non_negative_float("1")
    assert valid.non_negative_float("69.420")
    assert valid.non_negative_float("")
    assert not valid.non_negative_float("-69.420")
    assert not valid.non_negative_float("-1")
    assert not valid.non_negative_float("foo")


def test_uint():
    assert valid.uint("0")
    assert valid.uint("1")
    assert not valid.uint("69.420")
    assert not valid.uint("")
    assert not valid.uint("-69.420")
    assert not valid.uint("-0")
    assert not valid.uint("-1")
    assert not valid.uint("foo")


def test_date():
    assert valid.date("20200101")
    assert valid.date("20200229")
    assert not valid.date("20210229")
    assert not valid.date("")
    assert not valid.date("0")
    assert not valid.date("20202020")
    assert not valid.date("20201040")
