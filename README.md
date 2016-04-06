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
  * Ubuntu: `sudo apt-get install build-essential git`
  * Mac OS X: Install Xcode and run `xcode-select --install` from a command line

## Installation

To run the current development version of iD-indoor on your own computer:

1. Create a local `git clone` of the project, then `cd` into the project folder
2. Run `npm install`
3. Run `make`
4. Start a local web server, e.g. `python -m SimpleHTTPServer`
5. Open `http://localhost:8000/` in a web browser

For guidance on building a packaged version, running tests, and contributing to
development, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

iD-indoor is based on iD, so available under the same license.
iD is available under the [ISC License](https://opensource.org/licenses/ISC).
It includes [d3.js](http://d3js.org/), which BSD-licensed.

## Thank you

iD-indoor couldn't exist without the great work of the iD editor team.
Initial development of iD was made possible by a [grant of the Knight Foundation](http://www.mapbox.com/blog/knight-invests-openstreetmap/).
