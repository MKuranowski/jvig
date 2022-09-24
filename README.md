<img src="https://raw.githubusercontent.com/MKuranowski/jvig/master/icon/jvig.svg" alt="logo" width="128" />  

jvig
====

Pronounced d͡ʑvʲik (from 🇵🇱dźwig), it's a GTFS Viewer, created using Flask.

jvig is still work-in-progress, but **it works**.


Installation
------------

Install Python (at least 3.9) and pip. Consult your OS repositories for the package names,
but these are usually `python3` and `python3-pip`. If you use a system without a package manager,
I'd strongly recommend using one, like brew (for MacOS) or Chocolatey (for Windows).

After that, install jvig using pip: `pip install --upgrade jvig`.


Usage
-----

```
jvig /path/to/gtfs.zip
```

or (if the place where pip install scripts is not in PATH):

```
python3 -m jvig /path/to/gtfs.zip
```

jvig can open both folders and ZIP archives.

jvig itself doesn't contain a GUI - rather it spawns a web server on localhost and port 5000.
After seeing ` * Running on http://127.0.0.1:5000` on the console, open up <http://127.0.0.1:5000>.

#### WARNING: This is a development server.

jvig uses the default Flask server, which is not suitable for opening up to the Internet.
jvig only binds to the loopback address, and the server is only accessible from your own computer.

Please don't serve jvig to the whole web.


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


Development
-----------

This project uses `isort` and `black` for file formatting and `pyright` for type checking.
The maximum line length is increased to 99, and the type checking is set to strict.

CI runs the following commands to help maintain high code quality:

```console
$ black --check .
$ isort --check .
$ pyright
$ python -m pytest
```

If you use VS Code I recommend using the following settings:

```json
{
    "[python]": {
        "editor.codeActionsOnSave": {
            "source.organizeImports": true
        },
        "editor.formatOnSave": true
    },
    "js/ts.implicitProjectConfig.checkJs": true,
    "python.formatting.provider": "black",
    "python.languageServer": "Pylance",
    "python.linting.enabled": false,
}
```
