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
