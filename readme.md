⚠️ It's a test project for me to learn Electron and Typescript. Shitty code ahead!

<img src="icon/jvig.svg" alt="logo" width="128" />  

jvig
====

Pronounced d͡ʑvʲik (from 🇵🇱dźwig), it's a GTFS Viewer, created using Electron.  
I also came up with a crappy backronym for jvig: Javascript Visulaizer of GTFS Information.

jvig is still work-in-progress, but **it works**.

Currently, only AppImages and Windows NSIS installers are provided (all for x86_64).


Usage
-----

```
./path/to/jvig_executable ./path/to/gtfs
```

jvig can open both folders and ZIP archives.

You can add the executable to Open With menu of your operating system.  
Dragging a file/folder to the icon on Windows should also work.



Features/Todos
--------------

| GTFS Table         | Viewable? |
|--------------------|-------|
| agencies           | ✔️     |
| stops              | ✔️     |
| routes             | ✔️     |
| trips              | ✔️     |
| frequencies        | ✔️     |
| calendars          | ✔️     |
| fares              | ❌    |
| transfers          | ❌    |
| pathways           | ❌    |
| feed_info          | ❌    |
| attributions       | ❌    |
| translations       | ❌    |

| App Improvement       | Done? |
|-----------------------|----|
| search                | ❌ |
| single-page site      | ❌ |
| verify dark mode      | ✔️ |
| add file-picker if no file was provided | ✔️ (0.2.0) |
| better loading screen | ✔️ (0.1.5) |
| Windows release       | ✔️ (0.1.5) |
| macOS release         | ❌ (don't have a mac to test things) |


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
