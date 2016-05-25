iD.Entity = function(attrs) {
    // For prototypal inheritance.
    if (this instanceof iD.Entity) return;

    // Create the appropriate subtype.
    if (attrs && attrs.type) {
        return iD.Entity[attrs.type].apply(this, arguments);
    } else if (attrs && attrs.id) {
        return iD.Entity[iD.Entity.id.type(attrs.id)].apply(this, arguments);
    }

    // Initialize a generic Entity (used only in tests).
    return (new iD.Entity()).initialize(arguments);
};

iD.Entity.id = function(type) {
    return iD.Entity.id.fromOSM(type, iD.Entity.id.next[type]--);
};

iD.Entity.id.next = {node: -1, way: -1, relation: -1};

iD.Entity.id.fromOSM = function(type, id) {
    return type[0] + id;
};

iD.Entity.id.toOSM = function(id) {
    return id.slice(1);
};

iD.Entity.id.type = function(id) {
    return {'n': 'node', 'w': 'way', 'r': 'relation'}[id[0]];
};

// A function suitable for use as the second argument to d3.selection#data().
iD.Entity.key = function(entity) {
    return entity.id + 'v' + (entity.v || 0);
};

//Level values (only integers) in an interval, bounded with '-'
iD.Entity.lvlRgx3 = /^(-?\d+)-(-?\d+)$/;
//Level values from start to end (example: "-3 to 2")
iD.Entity.lvlRgx4 = /^(?:\w+ )?(-?\d+) to (-?\d+)$/;

//Looks for the write level tag to parse, and returns found levels
iD.Entity.parseLevelsTags = function(tags) {
	var levels;
	
	//No this.tags
	if(tags == null) {
		levels = [];
	}
	//Tag level
	else if(tags.level != undefined) {
		levels = iD.Entity.parseLevelString(tags.level);
	}
	//Tag repeat_on
	else if(tags.repeat_on != undefined) {
		levels = iD.Entity.parseLevelString(tags.repeat_on);
	}
	//Tag min_level and max_level
	else if(tags.min_level != undefined && tags.max_level != undefined) {
		levels = iD.Entity.parseLevelString(tags.min_level+"-"+tags.max_level);
	}
	//Tag buildingpart:verticalpassage:floorrange
	else if(tags["buildingpart:verticalpassage:floorrange"] != undefined) {
		levels = iD.Entity.parseLevelString(tags["buildingpart:verticalpassage:floorrange"]);
	}
	
	return (levels == null) ? [] : levels;
};

//Parse one string value from a level-related tag
iD.Entity.parseLevelString = function(str) {
	var result = null;
	
	//Level values separated by ';'
	if(/^-?\d+(?:\.\d+)?(?:;-?\d+(?:\.\d+)?)*$/.test(str)) {
		result = str.split(';');
		for(var i=0; i < result.length; i++) {
			result[i] = parseFloat(result[i]);
		}
	}
	//Level values separated by ','
	else if(/^-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?)*$/.test(str)) {
		result = str.split(',');
		for(var i=0; i < result.length; i++) {
			result[i] = parseFloat(result[i]);
		}
	}
	//Level intervals
	else {
		var regexResult = null;
		var min = null;
		var max = null;
		
		if(iD.Entity.lvlRgx3.test(str)) {
			regexResult = iD.Entity.lvlRgx3.exec(str);
			min = parseInt(regexResult[1]);
			max = parseInt(regexResult[2]);
		}
		else if(iD.Entity.lvlRgx4.test(str)) {
			regexResult = iD.Entity.lvlRgx4.exec(str);
			min = parseInt(regexResult[1]);
			max = parseInt(regexResult[2]);
		}
		
		//Add values between min and max
		if(regexResult != null && min != null && max != null) {
			result = [];
			if(min > max) {
				var tmp = min;
				min = max;
				max = tmp;
			}
			
			//Add intermediate values
			for(var i=min; i != max; i=i+((max-min)/Math.abs(max-min))) {
				result.push(i);
			}
			result.push(max);
		}
	}
	
	return result;
};

iD.Entity.prototype = {
    tags: {},

    initialize: function(sources) {
        for (var i = 0; i < sources.length; ++i) {
            var source = sources[i];
            for (var prop in source) {
                if (Object.prototype.hasOwnProperty.call(source, prop)) {
                    if (source[prop] === undefined) {
                        delete this[prop];
                    } else {
                        this[prop] = source[prop];
                    }
                }
            }
        }

        if (!this.id && this.type) {
            this.id = iD.Entity.id(this.type);
        }
        if (!this.hasOwnProperty('visible')) {
            this.visible = true;
        }
        
        //try to find levels for this feature
		this.levels = iD.Entity.parseLevelsTags(this.tags);

        if (iD.debug) {
            Object.freeze(this);
            Object.freeze(this.tags);

            if (this.loc) Object.freeze(this.loc);
            if (this.nodes) Object.freeze(this.nodes);
            if (this.members) Object.freeze(this.members);
        }

        return this;
    },

    copy: function(resolver, copies) {
        if (copies[this.id])
            return copies[this.id];

        var copy = iD.Entity(this, {id: undefined, user: undefined, version: undefined});
        copies[this.id] = copy;

        return copy;
    },

    osmId: function() {
        return iD.Entity.id.toOSM(this.id);
    },

    isNew: function() {
        return this.osmId() < 0;
    },

    update: function(attrs) {
        return iD.Entity(this, attrs, {v: 1 + (this.v || 0)});
    },

    mergeTags: function(tags) {
        var merged = _.clone(this.tags), changed = false;
        for (var k in tags) {
            var t1 = merged[k],
                t2 = tags[k];
            if (!t1) {
                changed = true;
                merged[k] = t2;
            } else if (t1 !== t2) {
                changed = true;
                merged[k] = _.union(t1.split(/;\s*/), t2.split(/;\s*/)).join(';');
            }
        }
        return changed ? this.update({tags: merged}) : this;
    },

    intersects: function(extent, resolver) {
        return this.extent(resolver).intersects(extent);
    },

    isUsed: function(resolver) {
        return _.without(Object.keys(this.tags), 'area', 'level').length > 0 ||
            resolver.parentRelations(this).length > 0;
    },

    hasInterestingTags: function() {
        return _.keys(this.tags).some(iD.interestingTag);
    },

    isHighwayIntersection: function() {
        return false;
    },

    deprecatedTags: function() {
        var tags = _.toPairs(this.tags);
        var deprecated = {};

        iD.data.deprecated.forEach(function(d) {
            var match = _.toPairs(d.old)[0];
            tags.forEach(function(t) {
                if (t[0] === match[0] &&
                    (t[1] === match[1] || match[1] === '*')) {
                    deprecated[t[0]] = t[1];
                }
            });
        });

        return deprecated;
    },
	
	isOnLevel: function(lvl) {
		return this.levels.indexOf(lvl) >= 0 || (this.levels.length == 0 && lvl == 0);
	}
};
