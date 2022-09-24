<img src="icon/jvig.svg" alt="logo" width="128" />  

jvig
====

Pronounced d͡ʑvʲik (from 🇵🇱dźwig), it's a GTFS Viewer, created using Flask.

jvig is still work-in-progress, but **it works**.


Usage
-----

```
python3 -m jvig /path/to/gtfs.zip
```

jvig can open both folders and ZIP archives.


Features/Todos
--------------

#### Shown GTFS tables

- [x] agencies
- [x] stops
- [x] routes
- [x] trips
- [x] frequencies
- [x] calendars
- [ ] fares
- [ ] transfers
- [ ] pathways
- [ ] feed_info
- [ ] attributions
- [ ] translations
- [x] shapes

#### Other improvements
- [x] search (provided by the browser)
- [x] verify dark mode
- [ ] file-picker if no file was provided
- [ ] better loading screen


License
-------

GNU GPL v3 or later.
Full text available in file license.md. 


Icon
----

Awful, I know. Make a better one if you want to.

Currently it's these 2 things combined:
- <https://thenounproject.com/term/crane/1689627/> (bought the rights to use)
- <https://material.io/resources/icons/?icon=directions_bus&style=outline> (apache 2.0)
