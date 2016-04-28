# iD-indoor - friendly JavaScript indoor editor for [OpenStreetMap](http://www.openstreetmap.org/)

## Basics

* iD-indoor is a JavaScript [OpenStreetMap](http://www.openstreetmap.org/) editor.
* It's based on [iD, the simple OpenStreetMap editor](http://ideditor.com/).
* It's intentionally simple. It lets you do the most basic tasks while
  not breaking other people's data.
* It's focused on [indoor mapping](http://wiki.openstreetmap.org/wiki/Indoor_Mapping), making contributions easier.
* It supports modern browsers. Data is rendered with [d3.js](http://d3js.org/).

## Live instance

* See [it working in live here](http://github.pavie.info/id-indoor).

## Participate!

* You can report bugs or missing features in [the issue tracker](https://git.framasoft.org/PanierAvide/iD-indoor/issues).
* If you see a bug not related to indoor features, you can report it in the [iD issue tracker](https://github.com/openstreetmap/iD/issues).

## Prerequisites
* [Node.js](http://nodejs.org/) version 0.10.0 or newer
* Command line development tools (`make`, `git`, and a compiler) for your platform
  * Ubuntu:
    * `sudo apt-get install build-essential git`
  * Mac OS X:
    * Install [Xcode](https://developer.apple.com/xcode/) and run `xcode-select --install` from a command line
  * Windows (Cygwin):
    * Install [Git for Windows](https://git-scm.com/downloads)
    * Install [Cygwin](https://cygwin.com/install.html) - choose default packages + `make`, `wget`, `apache2` (needed for updated mime type list)
    * Optionally, install [apt-cyg](https://github.com/transcode-open/apt-cyg) for managing your Cygwin packages
    * Edit `~/.bashrc`:<br/>
      Put Git for Windows before Cygwin in PATH, otherwise `npm install` may [fail to fetch git repositories](https://github.com/npm/npm/issues/7456)<br/><pre>
      export PATH=/cygdrive/c/Program\ Files/Git/mingw64/bin/:$PATH</pre>
    * Edit `~/.gitconfig`:<br/>
      Add these lines to avoid checking in files with CRLF newlines<br><pre>
      [core]
          autocrlf = input</pre>

## Installation

To run the current development version of iD-indoor on your own computer:

1. Create a local `git clone` of the project, then `cd` into the project folder
2. (Windows Only)  Run `fixWinSymlinks.bat`.  This script will prompt for Administrator rights.  see also: http://stackoverflow.com/questions/5917249/git-symlinks-in-windows
3. Run `npm install`
4. Run `make`
5. Start a local web server, e.g. `python -m SimpleHTTPServer`
6. Open `http://localhost:8000/` in a web browser

For guidance on building a packaged version, running tests, and contributing to
development, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

iD-indoor is based on iD, so available under the same license.
iD is available under the [ISC License](https://opensource.org/licenses/ISC).
It includes [d3.js](http://d3js.org/), which BSD-licensed.

## Thank you

iD-indoor couldn't exist without the great work of the iD editor team.
Initial development of iD was made possible by a [grant of the Knight Foundation](http://www.mapbox.com/blog/knight-invests-openstreetmap/).
