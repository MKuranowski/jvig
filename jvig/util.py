

def time_to_int(time: str) -> int:
    try:
        h, m, s = map(int, time.split(":"))
        return h*3600 + m*60 + s
    except ValueError:
        return -1
