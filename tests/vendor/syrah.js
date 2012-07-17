(function() {
window.Syrah = Ember.Namespace.create({
  CURRENT_API_REVISION: 1
});

})();



(function() {
// IE < 9 shim
if (!Date.prototype.toISOString) {
    (function() {
        function pad(number) {
            var r = String(number);
            if (r.length === 1) {
                r = '0' + r;
            }
            return r;
        }

        Date.prototype.toISOString = function() {
            return this.getUTCFullYear()
                + '-' + pad(this.getUTCMonth() + 1)
                + '-' + pad(this.getUTCDate())
                + 'T' + pad(this.getUTCHours())
                + ':' + pad(this.getUTCMinutes())
                + ':' + pad(this.getUTCSeconds())
                + '.' + String((this.getUTCMilliseconds()/1000).toFixed(3)).slice(2, 5)
                + 'Z';
        };

        /**
         * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
         * © 2011 Colin Snover <http://zetafleet.com>
         * Released under MIT license.
         */
        var origParse = Date.parse, numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
        Date.parse = function (date) {
            var timestamp, struct, minutesOffset = 0;

            // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
            // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
            // implementations could be faster
            //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
            if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
                // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
                for (var i = 0, k; (k = numericKeys[i]); ++i) {
                    struct[k] = +struct[k] || 0;
                }

                // allow undefined days and months
                struct[2] = (+struct[2] || 1) - 1;
                struct[3] = +struct[3] || 1;

                if (struct[8] !== 'Z' && struct[9] !== undefined) {
                    minutesOffset = struct[10] * 60 + struct[11];

                    if (struct[9] === '+') {
                        minutesOffset = 0 - minutesOffset;
                    }
                }

                timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
            }
            else {
                timestamp = origParse ? origParse(date) : NaN;
            }

            return timestamp;
        };
    }());
}
})();



(function() {
Syrah.Inflector = Ember.Object.extend({
	
});

Syrah.Inflector.reopenClass({	
	pluralRules: {
		'(fish)$'                 : '$1$2',       // fish
		'(x|ch|ss|sh)$'           : '$1es',       // search, switch, fix, box, process, address
		'series$'                 : '$1series',
        '([^aeiouy]|qu)ies$'      : '$1y',
        '([^aeiouy]|qu)y$'        : '$1ies',      // query, ability, agency
        '(?:([^f])fe|([lr])f)$'   : '$1$2ves',    // half, safe, wife
        'sis$'                    : 'ses',        // basis, diagnosis
        '([ti])um$'               : '$1a',        // datum, medium
        'person$'                 : 'people',     // person, salesperson
        'man$'                    : 'men',        // man, woman, spokesman
        'child$'                  : 'children',   // child
        '(alias|status)$i'        : '$1es',
        's$'                      : 's',          // no change (compatibility)
        '$'                       : 's'
	},
	
	singularRules: {
		'(f)ish$i'                : '$1$2ish',
        '(x|ch|ss)es$'            : '$1',
        'movies$'                 : 'movie',
        'series$'                 : 'series',
        '([^aeiouy]|qu)ies$'      : '$1y',
        '([lr])ves$'              : '$1f',
        '([^f])ves$'              : '$1fe',
        '(analy|ba|diagno|parenthe|progno|synop|the)ses$' : '$1sis',
        '([ti])a$'                : '$1um',
        'people$'                 : 'person',
        'men$'                    : 'man',
        '(alias|status)es$i'      : '$1',
        'children$'               : 'child',
        'news$'                   : 'news',
        's$'                      : ''
	},
	
	getCollectionName: function(type) {
		return Syrah.Inflector.pluralize(Syrah.Inflector.getTypeName(type));
	},
	
	getTypeName: function(type) {
		var parts = type.toString().split(".");
	    var name = parts[parts.length - 1];
	    return name.underscore();
	},
	
	getTypeNamespace: function(type) {
		return type.toString().split(".")[0];
	},

    getFkForType: function(type) {
        return Syrah.Inflector.getTypeName(type) + '_id';
    },

    getFkName: function(type) {
        return type.split('.')[0];
    },


    guessAssociationType: function(collectionName, parentType) {
        var currentNamespace = Syrah.Inflector.getTypeNamespace(parentType);
        var possibleType = Syrah.Inflector.singularize(collectionName).camelize().ucfirst();

        if (window[currentNamespace] && window[currentNamespace][possibleType]) {
            return window[currentNamespace][possibleType];
        }
        return undefined;
    },
	
	pluralize: function(singular) {
		for (var regexString in Syrah.Inflector.pluralRules) {
			var regex = new RegExp(regexString, 'i');
			if (singular.match(regex)) {
				return singular.replace(regex, Syrah.Inflector.pluralRules[regexString]);
			}
		}
		return singular;
	},
	
	singularize: function(plural) {
		for (var regexString in Syrah.Inflector.singularRules) {
			var regex = new RegExp(regexString, 'i');
			if (plural.match(regex)) {
				return plural.replace(regex, Syrah.Inflector.singularRules[regexString]);
			}
		}
		return plural;
	},
	
	ucfirst: function(string) {
	    return string.charAt(0).toUpperCase() + string.slice(1);
	}
});

String.prototype.ucfirst = function() {
    return Syrah.Inflector.ucfirst(this);
};

})();



(function() {
Syrah.Model = Ember.Object.extend({

	id: Ember.computed(function(key, value) {
	    var pk = this.getPrimaryKey();
	
	    if (arguments.length === 2) {
	        this.setDbRef(pk, value);
	        return value;
	    }
	
	    return this.getDbRef(pk);
	}).property()

});

var expandPropertyDefinition = function(name, definition) {
    if (definition === Number || definition === String || definition === Boolean || definition === Date || definition === Object || definition.isModel === true) {
        definition = { type: definition };
    }
    Ember.assert("A property's definition must have a type", definition.type !== undefined);

    if (definition.type.isModel || typeof(definition.type) == 'string') {
        definition.isAssociation = true;
        if (definition.foreignKey === undefined) {
            definition.foreignKey = Syrah.Inflector.getFkForType(definition.type);
        }
        definition.observer = function() {
            if (this.get(name) === null) {
                this.setDbRef(definition.foreignKey, null);
            } else {
                var objectId = this.get(name).get('id');
                if (!Ember.none(objectId)) {
                    this.setDbRef(definition.foreignKey, objectId);
                }
            }
        }
    }

    if (definition.type === Syrah.HasMany) {
        Ember.assert("A HasMany must have an itemType", definition.itemType !== undefined);

        definition.isAssociation = true;
        definition.defaultValue = Syrah.HasMany.getComputedProperty(definition);
    }
    return definition;
}

Syrah.Model.reopenClass({
    define: function(schema) {
        var properties = {};
        var propertiesMeta = {};
        var primaryKey = 'id';

        if (schema.hasOwnProperty('primaryKey')) {
            primaryKey = schema.primaryKey;
            delete schema.primaryKey;
        }

        for (var propertyName in schema) {
            if (schema.hasOwnProperty(propertyName)) {
                var propertyDef = expandPropertyDefinition(propertyName, schema[propertyName]);
                propertiesMeta[propertyName] = propertyDef;
                var defaultValue = propertyDef.defaultValue || null;
                properties[propertyName] = defaultValue;
            }
        }

        var klass = this.extend(properties);
        klass.isModel = true;
        klass.__metadata__ = {
            primaryKey: primaryKey,
            definedProperties: propertiesMeta
        };

        return klass;
    },

    create: function(data) {
        var instance = this._super.apply(this, arguments);
        instance.__dbrefs__ = {};

        // TODO : put this in define()
        var assocs = instance.getAssociations();
        for (var assocName in assocs) {
            if (assocs[assocName].observer) {
                instance.addObserver(assocName, assocs[assocName].observer);
            }
        }

        return instance;
    }
});

Syrah.Model.reopen({
    duplicate: function(options) {
        options = options || {};
        var duplicateAssocs = options.duplicateAssociations || [];
        var includeAssocs = options.includeAssociations || [];

        var newInstance = this.constructor.create({});
        var data = {};

        //newInstance.beginPropertyChanges();

        var primitiveProps = this.getPrimitiveProperties();
        primitiveProps.forEach(function(propName) {
            data[propName] = this.get(propName);
        }, this);

        newInstance.setProperties(data);

        var filterSubAssocs = function(assocs, parentAssocName) {
            var subAssocs = [];
            var re = new RegExp('^' + parentAssocName + "\.");
            assocs.forEach(function(item) {
                if (item.match(re)) {
                    subAssocs.push(item.replace(re, ''));
                }
            });
            return subAssocs;
        }

        var assocs = this.getAssociations();
        for (var assocName in assocs) {
            if (duplicateAssocs.indexOf(assocName) === -1 && includeAssocs.indexOf(assocName) === -1) continue;
            var assoc = assocs[assocName];
            var subOptions = {
                duplicateAssociations: filterSubAssocs(duplicateAssocs, assocName),
                includeAssociations: filterSubAssocs(includeAssocs, assocName)
            };
            if (assoc.type === Syrah.HasMany) {
                this.get(assocName).forEach(function(item) {
                    if (duplicateAssocs.indexOf(assocName) !== -1) {
                        newInstance.get(assocName).pushObject(item.duplicate(subOptions));
                    } else if (includeAssocs.indexOf(assocName) !== -1) {
                        newInstance.get(assocName).pushObject(item);
                    }
                });
            } else {
                if (duplicateAssocs.indexOf(assocName) !== -1) {
                    newInstance.set(assocName, this.get(assocName).duplicate(subOptions));
                } else if (includeAssocs.indexOf(assocName) !== -1) {
                    newInstance.set(assocName, this.get(assocName));
                }
            }
        }

        //newInstance.endPropertyChanges();
        return newInstance;
    },

    isNew: function() {
        return this.get('id') === undefined;
    },

    getPrimaryKey: function() {
        return this.getMetadata().primaryKey;
    },

    setDbRef: function(key, value) {
        this.__dbrefs__[key] = value;
    },

    getDbRef: function(key) {
        return this.__dbrefs__[key];
    },

    getDbRefsPossibleKeys: function() {
        return [this.getPrimaryKey()];
    },

    getAssociations: function() {
        var assocs = {};
        var props = this.getMetadata().definedProperties;
        for (var propName in props) {
            if (props[propName].isAssociation) assocs[propName] = props[propName];
        }
        return assocs;
    },

    getPropertyType: function(propertyName) {
        return this.getPropertyDefinition(propertyName).type;
    },

    getPropertyDefault: function(propertyName) {
        return this.getPropertyDefinition(propertyName).defaultValue;
    },

    getPropertyDefinition: function(propertyName) {
        Ember.assert("Property '" + propertyName + "' has not been defined", this.getMetadata().definedProperties.hasOwnProperty(propertyName));
        return this.getMetadata().definedProperties[propertyName];
    },

    getPrimitiveProperties: function() {
        return this.getDefinedProperties().filter(function(item) {
            return !this.getPropertyDefinition(item).isAssociation;
        }, this);
    },

    getDefinedProperties: function() {
        return Ember.keys(this.getMetadata().definedProperties);
    },

    getMetadata: function() {
        return this.constructor.__metadata__;
    }
});

Syrah.Model.reopenClass({
    getPk: function() {
        return this.__metadata__.primaryKey;
    }
});

Syrah.HasMany = Ember.Object.extend({});

Syrah.HasMany.getComputedProperty = function(options) {
    var fk = options.foreignKey || null;

    return Ember.computed(function(key, value) {
        return Syrah.HasManyCollection.create({
            type: options.type,
            content: [],
            parentObject: this,
            foreignKey: fk
        });
    }).property().cacheable();
}

Syrah.ModelCollection = Ember.ArrayProxy.extend({
    type: null,
    content: []
});

Syrah.HasManyCollection = Syrah.ModelCollection.extend({
    parentObject: null,
    foreignKey: null,

    pushObject: function(object) {
        var fk = this.get('foreignKey');
        if (fk === null) {
            fk = Syrah.Inflector.getFkForType(this.get('parentObject').constructor);
        }
        var parentId = this.get('parentObject').get('id');
        if (!Ember.none(parentId)) {
            var propertyName = Syrah.Inflector.getFkName(fk);
            object.setDbRef(fk, parentId);
            object.set(propertyName, this.get('parentObject'));
        }
        this._super(object);
    }
});

Syrah.typecastFor = function(type) {
    switch(type) {
        case Date:
            return Syrah.typecasts['date'];
            break;
        default:
            return undefined;
    }
}

Syrah.typecasts = {
    'date' : {
        fromJson: function(value) {
            if (typeof value === 'string' || typeof value === 'number') {
                return new Date(Date.parse(value));
            }
            return null;
        },
        toJson: function(value) {
            if (value instanceof Date) {
                return value.toISOString();
            }
            return value;
        }
    }
}

})();



(function() {
Syrah.JSONMarshaller = Ember.Object.extend({
	
	marshall: function(object, options) {
		var options = options || {};
        if (object instanceof Syrah.Model) return this.marshallModel(object, options.embedded);
        return this.marshallSimpleObject(object);
	},

    unmarshall: function(json, object) {
        if (object instanceof Syrah.Model) return this.unmarshallModel(json, object);
        return this.unmarshallSimpleObject(json, object);
    },

    marshallModel: function(object, embedded) {
        var primitiveProps = object.getPrimitiveProperties();
        var embeddedAssocs = embedded || [];

        var data = object.getProperties(primitiveProps);

        var definedProps = object.getMetadata().definedProperties;

        for (var propName in data) {
            var type = definedProps[propName].type;
            var typecast = Syrah.typecastFor(type);
            if (typecast !== undefined) {
                data[propName] = typecast.toJson(data[propName]);
            }
        }

        var filterSubEmbeddedAssocs = function(parentAssocName) {
            var subEmbeddedAssocs = [];
            var re = new RegExp('^' + parentAssocName + "\.");
            embeddedAssocs.forEach(function(item) {
                if (item.match(re)) {
                    subEmbeddedAssocs.push(item.replace(re, ''));
                }
            });
            return subEmbeddedAssocs;
        }

        var assocs = object.getAssociations();
        for (var assocName in assocs) {
            if (embeddedAssocs.indexOf(assocName) === -1) continue;

            var propDef = definedProps[assocName];
            if (propDef.type === Syrah.HasMany) {
                var value = [];
                object.get(assocName).get('content').forEach(function(item) {
                    value.push(this.marshallModel(item, filterSubEmbeddedAssocs(assocName)));
                }, this);
                data[assocName] = value;
            } else {
                data[assocName] = this.marshallModel(object.get(assocName), filterSubEmbeddedAssocs(assocName));
            }
        }

        for (var key in object.__dbrefs__) data[key] = object.__dbrefs__[key];

        return data;
    },

    unmarshallModel: function(json, object) {
        var definedProps = object.getMetadata().definedProperties;
        var dbRefsPossibleKeys = object.getDbRefsPossibleKeys();
        var stdPropsValues = {};

        object.beginPropertyChanges();
        for (var key in json) {
            var value = json[key];

            if (dbRefsPossibleKeys.indexOf(key) !== -1) {
                object.setDbRef(key, value);
            }

            if (!definedProps.hasOwnProperty(key)) continue;

            var propDef = definedProps[key];

            if (propDef.isAssociation === true) {
                if (propDef.type === Syrah.HasMany && value instanceof Array) {
                    var assocType = (Ember.typeOf(propDef.itemType) === 'string') ? Ember.getPath(propDef.itemType) : propDef.itemType;
                    value.forEach(function(hash) {
                        // TODO : use replaceContent() or something like that
                        object.get(key).pushObject(this.unmarshallModel(hash, assocType.create()));
                    }, this);
                } else if (value instanceof Object) {
                    var assocType = (Ember.typeOf(propDef.type) === 'string') ? Ember.getPath(propDef.type) : propDef.type;
                    object.set(key, this.unmarshallModel(value, assocType.create()))
                }
            } else {
                var typecast = Syrah.typecastFor(propDef.type);
                if (typecast !== undefined) {
                    value = typecast.fromJson(value);
                }
                stdPropsValues[key] = value;
            }
        }
        object.setProperties(stdPropsValues);
        object.endPropertyChanges();
        return object;
    },

    // WARNING : this doesn't work in IE8... (*ALL* object properties are marshalled...)
    marshallSimpleObject: function(object) {
        var v, attrs = [];

        for (var prop in object) {
            if (object.hasOwnProperty(prop)) {
                v = object[prop];
                if (v === 'toString') {
                    continue;
                }
                if (Ember.typeOf(v) === 'function') {
                    continue;
                }
                attrs.push(prop);
            }
        }
        var json = object.getProperties(attrs);

        return json;
    },
	
	unmarshallSimpleObject: function(json, object) {
		var props = {};
		for (var k in json) {
			v = json[k];
			if (v instanceof Array) {
				props[k] = Ember.A([]);
				var assocType = Syrah.Inflector.guessAssociationType(k, object.constructor);
                if (assocType === undefined) assocType = Ember.Object;
				v.forEach(function(hash) {
					props[k].push(this.unmarshall(hash, assocType.create()));
				}, this);
			} else {
				props[k] = v;
			}
		}
		object.beginPropertyChanges();
		object.setProperties(props);
		object.endPropertyChanges();
		return object;
	}
});
})();



(function() {
Syrah.Bulk = Ember.Object.extend({
    store: null,
    created: null,
    updated: null,
    deleted: null,

    init: function() {
        this._super();
        this.emptyBuckets();
    },

    save: function(object) {
        if (object.isNew()) {
            this.pushObjectInBucket('created', object);
        } else {
            this.pushObjectInBucket('updated', object);
        }
    },

    destroy: function(object) {
        this.pushObjectInBucket('deleted', object);
    },

    commit: function(options) {
        this.commitCreated(options);
        this.commitUpdated(options);
        this.commitDeleted(options);

        this.emptyBuckets();
    },

    commitCreated: function(options) {
        var store = this.get('store');
        var bucket = this.get('created');
        for (var type in bucket) {
            var json = [];
            bucket[type].forEach(function(object) {
                json.pushObject(store.toJSON(object));
            });
            var callbacks = this.prepareCallbacks(store.didAddObjects, bucket[type], options);
            store.ds.addInBulk(Ember.getPath(type), json, callbacks[0], callbacks[1]);
        }
    },

    commitUpdated: function(options) {
        var store = this.get('store');
        var bucket = this.get('updated');
        for (var type in bucket) {
            var json = [];
            bucket[type].forEach(function(object) {
                json.pushObject(store.toJSON(object));
            });
            var callbacks = this.prepareCallbacks(store.didUpdateObjects, bucket[type], options);
            store.ds.updateInBulk(Ember.getPath(type), json, callbacks[0], callbacks[1]);
        }
    },

    commitDeleted: function(options) {
        var store = this.get('store');
        var bucket = this.get('deleted');
        for (var type in bucket) {
            var json = [];
            bucket[type].forEach(function(object) {
                json.push(object.get('id'));
            });
            var callbacks = this.prepareCallbacks(store.didDestroyObjects, bucket[type], options);
            store.ds.destroyInBulk(Ember.getPath(type), json, callbacks[0], callbacks[1]);
        }
    },

    pushObjectInBucket: function(bucketName, object) {
        var bucket = this.get(bucketName),
            type = object.constructor;

        if (!bucket.hasOwnProperty(type)) bucket[type] = [];
        bucket[type].pushObject(object);
    },

    prepareCallbacks: function(mainSuccessCallback, objects, options) {
        var store = this.get('store');
        var successCallbacks = store.prepareCallbacks([mainSuccessCallback, store, objects], options, 'success');
        var errorCallbacks   = store.prepareCallbacks([store.didError, store, objects], options, 'error');
        return [successCallbacks, errorCallbacks];
    },

    emptyBuckets: function() {
        this.set('created', {});
        this.set('updated', {});
        this.set('deleted', {});
    }
});
})();



(function() {
Syrah.Store = Ember.Object.extend({
	
	ds: null,
	marshaller: Syrah.JSONMarshaller.create(),

    save: function(object, options) {
        if (object.isNew()) {
            return this.add(object, options);
        }
        return this.update(object, options);
    },
	
	add: function(object, options) {
        options = options || {};
        var embedded = options.embedded || [];
        var successCallbacks = this.prepareCallbacks([this.didAddObject, this, object, embedded], options, 'success');
        var errorCallbacks   = this.prepareCallbacks([this.didError, this, object], options, 'error');
        this.get('ds').add(object.constructor, this.toJSON(object, options), successCallbacks, errorCallbacks);
		return object;
	},
	
	update: function(object, options) {
        options = options || {};
        var successCallbacks = this.prepareCallbacks([this.didUpdateObject, this, object], options, 'success');
        var errorCallbacks   = this.prepareCallbacks([this.didError, this, object], options, 'error');
        this.get('ds').update(object.constructor, this.toJSON(object, options), successCallbacks, errorCallbacks);
		return object;
	},
	
	destroy: function(object, options) {
        options = options || {};
        var successCallbacks = this.prepareCallbacks([this.didDestroyObject, this, object], options, 'success');
        var errorCallbacks   = this.prepareCallbacks([this.didError, this, object], options, 'error');
		this.get('ds').destroy(object.constructor, this.toJSON(object, options), successCallbacks, errorCallbacks);
		return;
	},
	
	find: function(type, query) {
		if (query === undefined) {
			return this.all(type);
		} else {
            var collection = Ember.A([]);
            this.get('ds').find(type, collection, query, this.loadMany, this);
            return collection;
        }
	},
	
	findById: function(type, id) {
		var object = type.create();
		this.get('ds').findById(type, object, id, this.load, this);
		return object;
	},
	
	all: function(type) {
		var collection = Ember.A([]);
		this.get('ds').all(type, collection, this.loadMany, this);
		return collection;
	},

    bulk: function() {
        return Syrah.Bulk.create({ store: this });
    },
	
	loadMany: function(type, collection, data) {
		var objects = [];
		data.forEach(function(hash) {
			objects.push(this.load(type.create(), hash));
		}, this);
		collection.pushObjects(objects);
		return collection;
	},
	
	load: function(object, json) {
		return this.get('marshaller').unmarshall(json, object);
	},
	
	didAddObject: function(object, embedded, json) {
		// The DS must provide an ID for the newly created object in the returned JSON
        var pk = object.hasOwnProperty('getPrimaryKey') ? object.getPrimaryKey() : 'id';
        if (json[pk] === undefined) {
            throw "The DataSource has not provided an ID for the newly created object";
        }
        id = json[pk];
		object.set('id', id);

        if (embedded.length !== 0) {
            this.didAddEmbeddedObjects(object, embedded, json);
        }

		return object;
	},

    didAddEmbeddedObjects: function(object, embedded, json) {
        var assocs = object.getAssociations();
        var definedProps = object.getMetadata().definedProperties;

        var filterSubEmbeddedAssocs = function(parentAssocName) {
            var subEmbeddedAssocs = [];
            var re = new RegExp('^' + parentAssocName + "\.");
            embedded.forEach(function(item) {
                if (item.match(re)) {
                    subEmbeddedAssocs.push(item.replace(re, ''));
                }
            });
            return subEmbeddedAssocs;
        }

        for (var assocName in assocs) {
            if (embedded.indexOf(assocName) === -1) continue;

            if (json[assocName] === undefined) {
                throw "The DataSource has not provided a JSON value (with IDs) for the newly created '"+assocName+"' embedded object(s)";
            }

            var propDef = definedProps[assocName];
            if (propDef.type === Syrah.HasMany) {
                object.get(assocName).get('content').forEach(function(item, index) {
                    this.didAddObject(item, filterSubEmbeddedAssocs(assocName), json[assocName][index]);
                }, this);
            } else {
                this.didAddObject(item, filterSubEmbeddedAssocs(assocName), json[assocName]);
            }
        }
    },
	
	didUpdateObject: function(object, json) {
		
	},
	
	didDestroyObject: function(object) {
		object.destroy();
	},

    didAddObjects: function(objects, json) {
        json.forEach(function(item, index) {
            this.didAddObject(objects[index], [], item);
        }, this);
    },

    didUpdateObjects: function(objects, json) {

    },

    didDestroyObjects: function(objects) {
        objects.forEach(function(object) {
            this.didDestroyObject(object);
        }, this);
    },

    didError: function(object, error) {
        // TODO : do something smart here...
    },
	
	toJSON: function(object, options) {
		return this.get('marshaller').marshall(object, options);
	},

    prepareCallbacks: function(firstCallback, options, optionKey) {
        options = options || {};
        var callbacks = [];
        callbacks.push(firstCallback);
        if (options[optionKey] !== undefined && options[optionKey] instanceof Array) {
            callbacks.push(options[optionKey]);
        }
        return callbacks;
    }
});

})();



(function() {
Syrah.DataSource = Ember.Object.extend({
	
	all: null,
	find: null,
	findById: null,
	add: null,

    executeCallbacks: function(callbacks) {
        var passedArguments = arguments;
        callbacks.forEach(function(args) {
            var callback = args.shift();
            var context = args.shift();
            for (var i = 1; i < passedArguments.length; i++) { args.push(passedArguments[i]); }
            callback.apply(context, args);
        }, this);
    },
	
	getCollectionName: function(type) {
		return Syrah.Inflector.getCollectionName(type);
	}
	
});

})();



(function() {
Syrah.RESTApiDataSource = Syrah.DataSource.extend({
	
	baseUrl: '',
    urlEncodeData: false,
	
	all: function(type, collection, callback, store) {
		this.ajax(type, this.buildUrl(type), 'GET', {
			success: function(json) {
				callback.call(store, type, collection, json);
			}
		});
	},

    find: function(type, collection, query, callback, store) {
        this.ajax(type, this.buildUrl(type), 'GET', {
            data: query,
            success: function(json) {
                callback.call(store, type, collection, json);
            }
        });
    },
	
	findById: function(type, object, id, callback, store) {
		this.ajax(type, this.buildUrl(type) + '/' + id, 'GET', {
			success: function(json) {
				callback.call(store, object, json);
			}
		});
	},
	
	add: function(type, json, successCallbacks, errorCallbacks) {
		this.ajax(type, this.buildUrl(type), 'POST', {
			data: this.encodePayload(type, json)
		}, successCallbacks, errorCallbacks);
	},

    addInBulk: function(type, json, successCallbacks, errorCallbacks) {
        this.ajax(type, this.buildUrl(type) + '/bulk', 'POST', {
            data: this.encodeBulkPayload(type, json)
        }, successCallbacks, errorCallbacks);
    },
	
	update: function(type, json, successCallbacks, errorCallbacks) {
		var id = json[type.getPk()];
		this.ajax(type, this.buildUrl(type) + '/' + id, 'PUT', {
			data: this.encodePayload(type, json)
		}, successCallbacks, errorCallbacks);
	},

    updateInBulk: function(type, json, successCallbacks, errorCallbacks) {
        this.ajax(type, this.buildUrl(type) + '/bulk', 'PUT', {
            data: this.encodeBulkPayload(type, json)
        }, successCallbacks, errorCallbacks);
    },
	
	destroy: function(type, json, successCallbacks, errorCallbacks) {
        var id = json[type.getPk()];
		this.ajax(type, this.buildUrl(type) + '/' + id, 'DELETE', {}, successCallbacks, errorCallbacks);
	},

    destroyInBulk: function(type, json, successCallbacks, errorCallbacks) {
        this.ajax(type, this.buildUrl(type) + '/bulk', 'DELETE', {
            data: this.encodeBulkPayload(type, json)
        }, successCallbacks, errorCallbacks);
    },
	
	ajax: function(type, url, method, options, successCallbacks, errorCallbacks) {
		options.url = url,
		options.type = method,
		options.dataType = 'json';
		options.contentType = this.get('urlEncodeData') === false ? 'application/json; charset=utf-8'
                                                                  : 'application/x-www-form-urlencoded; charset=UTF-8';
		options.context = this;

		if (options.data && options.type !== 'GET' && this.get('urlEncodeData') === false) {
			options.data = JSON.stringify(options.data);
	    }

        if (options.success === undefined && successCallbacks !== undefined) {
            options.success = function(json, textStatus, xhr) {
                if (this.isRequestSuccessful(json, textStatus, xhr)) {
                    this.executeCallbacks(successCallbacks, this.parseResponseData(json, type));
                } else {
                    this.executeCallbacks(errorCallbacks, {}, this.parseErrorResponse(xhr.responseText), xhr); // TODO : pass a real exception
                }
            };
        }
        if (options.error === undefined && errorCallbacks !== undefined) {
            options.error = function(xhr, textStatus, errorThrown) {
                this.executeCallbacks(errorCallbacks, errorThrown, this.parseErrorResponse(xhr.responseText), xhr);
            };
        }

		jQuery.ajax(options);
	},

    buildPayload: function(store, object) {
        if (this.get('urlEncodeData') !== false) {
            var json = store.toJSON(object);
            var parts = [];
            var prefix = Syrah.Inflector.getTypeName(object.constructor);
            for (var k in json) {
                var value = json[k] === null ? '' : encodeURIComponent(json[k]);
                parts.push(prefix + '.' + k + '=' + value);
            }
            return parts.join('&');
        }
        return store.toJSON(object);
    },

    encodePayload: function(type, json, index, prefix) {
        if (this.get('urlEncodeData') !== false) {
            var parts = [];

            if (prefix !== undefined) prefix += '.';
            else prefix = '';
            prefix += Syrah.Inflector.getTypeName(type);

            if (index !== undefined) prefix+= '[' + index + ']';
            for (var k in json) {
                if (Ember.typeOf(json[k]) === 'array') {
                    parts.push(this.encodeBulkPayload(k, json[k], prefix));
                } else if (Ember.typeOf(json[k]) === 'object') {
                    parts.push(this.encodePayload(k, json[k], undefined, prefix));
                } else {
                    var value = json[k] === null ? '' : encodeURIComponent(json[k]);
                    parts.push(prefix + '.' + k + '=' + value);
                }
            }
            return parts.join('&');
        }
        return json;
    },

    encodeBulkPayload: function(type, json, prefix) {
        if (this.get('urlEncodeData') !== false) {
            var parts = [];
            json.forEach(function(item, index) {
                if (Ember.typeOf(item) !== 'instance' && Ember.typeOf(item) !== 'object') {
                    // it should be IDs for a DELETE then...
                    parts.push(type.getPk() + '[' + index + ']=' + item);
                } else {
                    if (prefix !== undefined) {
                        parts.push(this.encodePayload(type, item, index, prefix));
                    } else {
                        parts.push(this.encodePayload(type, item, index));
                    }
                }
            }, this);
            return parts.join('&');
        }
        return json;
    },
	
	buildUrl: function(type) {
		return this.get('baseUrl') + '/' + this.getCollectionName(type);
	},

    isRequestSuccessful: function(json, textStatus, xhr) {
        return true;
    },

    parseResponseData: function(json, type) {
        return json;
    },

    parseErrorResponse: function(responseText) {
        return JSON.parse(responseText);
    }
});

})();



(function() {
//Generate four random hex digits.
function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

// Generate a pseudo-GUID by concatenating random hexadecimal.
function guid() {
   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

Syrah.LocalStorageDataSource = Syrah.DataSource.extend({
	
	name: null,
	storage: localStorage,
	
	all: function(type, collection, callback, store) {
		var collectionName = this.getCollectionName(type);
		var objects = this.fetchMany(collectionName, this.keys(collectionName));
		callback.call(store, type, collection, objects);
		return collection;
	},
	
	findById: function(type, object, id, callback, store) {
		var collectionName = this.getCollectionName(type);
		var data = this.fetch(collectionName, id);
		callback.call(store, object, data);
		return object;
	},
	
	fetch: function(collectionName, key) {
		var json = this.get('storage').getItem(this.get('name') + ':' + collectionName + ':' + key);
		return JSON.parse(json);
	},
	
	fetchMany: function(collectionName, keys) {
		var objects = [];
		keys.forEach(function(key) {
			objects.push(this.fetch(collectionName, key));
		}, this);
		return objects;
	},
	
	add: function(type, json, successCallbacks, errorCallbacks) {
		var collectionName = this.getCollectionName(type);
		var keys = this.keys(collectionName);
		var objectKey = guid();
		keys.push(objectKey);
		this.persistKeys(collectionName, keys);
		this.persistObject(collectionName, objectKey, json);
        json['id'] = objectKey;
        this.executeCallbacks(successCallbacks, json);
	},
	
	update: function(type, json, successCallbacks, errorCallbacks) {
		var collectionName = this.getCollectionName(type);
        var objectKey = json[type.getPk()];
		// TODO : check key existence ?
		this.persistObject(collectionName, objectKey, json);
        this.executeCallbacks(successCallbacks, json);
	},
	
	destroy: function(type, json, successCallbacks, errorCallbacks) {
		var collectionName = this.getCollectionName(type);
		var keys = this.keys(collectionName);
        var objectKey = json[type.getPk()];
		keys.removeAt(keys.indexOf(objectKey));
		this.persistKeys(collectionName, keys);
		
		this.get('storage').removeItem(this.get('name') + ':' + collectionName + ':' + objectKey);
        this.executeCallbacks(successCallbacks, json);
	},
	
	persistObject: function(collectionName, objectKey, data) {
		this.get('storage').setItem(this.get('name') + ':' + collectionName + ':' + objectKey, JSON.stringify(data));
	},
	
	keys: function(collectionName) {
		return this.get('storage').getItem(this.get('name') + ':' + collectionName).split(',');
	},
	
	persistKeys: function(collectionName, keys) {
		this.get('storage').setItem(this.get('name') + ':' + collectionName, keys.join(','));
	}
	
});

})();



(function() {

})();

