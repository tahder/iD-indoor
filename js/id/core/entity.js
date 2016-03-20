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

iD.Entity.prototype = {
    tags: {},
    levels: [],

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

        if (iD.debug) {
            Object.freeze(this);
            Object.freeze(this.tags);

            if (this.loc) Object.freeze(this.loc);
            if (this.nodes) Object.freeze(this.nodes);
            if (this.members) Object.freeze(this.members);
        }
        
        this.initLevels();

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
        return _.without(Object.keys(this.tags), 'area').length > 0 ||
            resolver.parentRelations(this).length > 0;
    },

    hasInterestingTags: function() {
        return _.keys(this.tags).some(iD.interestingTag);
    },

    isHighwayIntersection: function() {
        return false;
    },

    deprecatedTags: function() {
        var tags = _.pairs(this.tags);
        var deprecated = {};

        iD.data.deprecated.forEach(function(d) {
            var match = _.pairs(d.old)[0];
            tags.forEach(function(t) {
                if (t[0] === match[0] &&
                    (t[1] === match[1] || match[1] === '*')) {
                    deprecated[t[0]] = t[1];
                }
            });
        });

        return deprecated;
    },

	getLevels: function() {
		return this.levels;
	},
	
	initLevels: function() {
		//try to find levels for this feature
		var currentLevel = null;
		
		//No this.tags
		if(this.tags == null) {
			currentLevel = [];
		}
		//Tag level
		else if(this.tags.level != undefined) {
			currentLevel = this.parseLevels(this.tags.level);
		}
		//Tag repeat_on
		else if(this.tags.repeat_on != undefined) {
			currentLevel = this.parseLevels(this.tags.repeat_on);
		}
		//Tag min_level and max_level
		else if(this.tags.min_level != undefined && this.tags.max_level != undefined) {
			currentLevel = this.parseLevels(this.tags.min_level+"-"+this.tags.max_level);
		}
		//Tag buildingpart:verticalpassage:floorrange
		else if(this.tags["buildingpart:verticalpassage:floorrange"] != undefined) {
			currentLevel = this.parseLevels(this.tags["buildingpart:verticalpassage:floorrange"]);
		}
		//TODO Handle levels defined in parent relations
		
		//Save found levels
		if(currentLevel != null) {
			currentLevel.sort(iD.util.sortNumberArray);
			this.levels = currentLevel;
		}
		else {
			this.levels = [ 0 ];
		}
	},
    
	parseLevels: function(str) {
		var result = null;
		
		//Level values separated by ';'
		var regex1 = /^-?\d+(?:\.\d+)?(?:;-?\d+(?:\.\d+)?)*$/;
		
		//Level values separated by ','
		var regex2 = /^-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?)*$/;
		
		if(regex1.test(str)) {
			result = str.split(';');
			for(var i=0; i < result.length; i++) {
				result[i] = parseFloat(result[i]);
			}
			result.sort(iD.util.sortNumberArray);
		}
		else if(regex2.test(str)) {
			result = str.split(',');
			for(var i=0; i < result.length; i++) {
				result[i] = parseFloat(result[i]);
			}
			result.sort(iD.util.sortNumberArray);
		}
		//Level intervals
		else {
			var regexResult = null;
			var min = null;
			var max = null;
			
			//Level values (only integers) in an interval, bounded with '-'
			var regex3 = /^(-?\d+)-(-?\d+)$/;
			
			//Level values from start to end (example: "-3 to 2")
			var regex4 = /^(?:\w+ )?(-?\d+) to (-?\d+)$/;
			
			if(regex3.test(str)) {
				regexResult = regex3.exec(str);
				min = parseInt(regexResult[1]);
				max = parseInt(regexResult[2]);
			}
			else if(regex4.test(str)) {
				regexResult = regex4.exec(str);
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
	}
};
