//XXX set globally on init in application
//var config.revisit_url = 'http://localhost:3000/api/v0/facilities.json';

var $ = require('jquery'),
    _ = require('lodash'),
    LZString = require('lz-string'),
    ps = require('../../../common/js/pubsub'),
    config = require('../conf/config');

/*
 * FacilityTree class, contains accessors for facilities
 *
 * @nlat: north latitude
 * @slat: south latitude
 * @elng: east longitude
 * @wlng: west longitude
 *
 *
 * All underscore methods are helper methods to do the recursion
 */
var FacilityTree = function(nlat, wlng, slat, elng, db, id) {
    // Ajax request made below node definition
    var self = this,
        loadingDfd = $.Deferred();
    this.nlat = nlat;
    this.wlng = wlng;
    this.slat = slat;
    this.elng = elng;
    this.db = db;
    this.id = id;
    this.total = 0;
    this.count = 0;

    /*
     * FacilityNode class, node of the tree, knows how to access pouchDB to read compressed facilities
     *
     * @obj: JSON representation of the node
     */
    var facilityNode = function(obj) {

        // Bounding Box
        this.en = obj.en;
        this.ws = obj.ws;

        this.center = obj.center;
        this.sep = obj.sep;

        // Stats
        this.uncompressedSize = obj.uncompressedSize || 0;
        this.compressedSize = obj.compressedSize || 0;
        this.count = obj.count || 0;

        // Data
        this.isRoot = obj.isRoot;
        this.isLeaf = obj.isLeaf;
        this.children = {};
        if (this.isRoot) {
            self.total = obj.count;
        }
        if (this.isLeaf && obj.data) {
            this.setFacilities(obj.data);
        }

        // Children
        if (obj.children) {
            if (obj.children.wn)
                this.children.wn = new facilityNode(obj.children.wn);
            if (obj.children.en)
                this.children.en = new facilityNode(obj.children.en);
            if (obj.children.ws)
                this.children.ws = new facilityNode(obj.children.ws);
            if (obj.children.es)
                this.children.es = new facilityNode(obj.children.es);
        }

    };


    facilityNode.prototype.print = function(indent) {
        indent = indent || '';
        var shift = '--';

        console.log(indent + ' Node: ' + this.center[1], this.center[0], this.count);
        if (this.children.wn && this.children.wn.count) {
            console.log(indent + shift + ' NW');
            this.children.wn.print(indent + shift);
        }

        if (this.children.en && this.children.en.count) {
            console.log(indent + shift + ' NE');
            this.children.en.print(indent + shift);
        }

        if (this.children.ws && this.children.ws.count) {
            console.log(indent + shift + ' SW');
            this.children.ws.print(indent + shift);
        }

        if (this.children.es && this.children.es.count)  {
            console.log(indent + shift + ' SE');
            this.children.es.print(indent + shift);
        }

        console.log(indent + '__');
    };

    /*
     * Set the facilities array into pouchDB
     *
     * facilities is a compressed LZString16 bit representation of facilities contained in an one entry array
     */
    facilityNode.prototype.setFacilities = function(facilities) {
        var id = this.en[1]+''+this.ws[0]+''+this.ws[1]+''+this.en[0],
            node = this;
        // Upsert deals with put 409 conflict bs
        db.upsert(id, function(doc) {
            doc.facilities = facilities;
            return doc;
        })
            .then(function () {
                console.log('Set:', id);
                self.count += node.count;
                if (self.count === self.total) {
                    // we're done?
                    console.log('we are done setting facilities, maybe?');
                    self.reconcileFacilities();
                }
            }).catch(function (err) {
                console.log('Failed to Set:', err);
            });
    };

    /*
     * Get facilities for this node
     *
     * returns jquery deferred that will resolve to an array of uncompressed facilities
     */
    facilityNode.prototype.getFacilities = function() {
        var id = this.en[1]+''+this.ws[0]+''+this.ws[1]+''+this.en[0];
        var d = $.Deferred();
        db.get(id).then(function(facilitiesDoc) {
            console.log('Get:', id);
            var facilitiesLZ = facilitiesDoc.facilities[0]; // Why an array? WHO KNOWS
            var facilities = JSON.parse(LZString.decompressFromUTF16(facilitiesLZ));
            d.resolve(facilities);
        }).catch(function (err) {
            console.log('Failed to Get:', err);
            d.reject();
        });

        return d;
    };

    facilityNode.prototype.within = function(lat, lng) {
        var self = this;
        return ((lat < self.en[1] && lat >= self.ws[1])
               && (lng > self.ws[0] && lng <= self.en[0]));
    };

    facilityNode.prototype.crossesBound = function(nlat, wlng, slat, elng) {
        var self = this;

        if ((nlat < self.ws[1]) || (slat > self.en[1]))
            return false;

        if ((wlng > self.en[0]) || (elng < self.ws[0]))
            return false;

        return true;
    };

    facilityNode.prototype.distance = function(lat, lng) {
        var self = this;
        var R = 6371000; // metres
        var e = self.center[1] * Math.PI/180;
        var f = lat * Math.PI/180;
        var g = (lat - self.center[1]) * Math.PI/180;
        var h = (lng - self.center[0]) * Math.PI/180;

        var a = Math.sin(g/2) * Math.sin(g/2) +
                Math.cos(e) * Math.cos(f) *
                Math.sin(h/2) * Math.sin(h/2);

        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    };


    // If there are facilities in local storage for this survey,
    // don't re-fetch them automatically. Otherwise attempt to load them.
    var facilities = this.loadTreeFromLocalStorage();

    if (facilities) {
        console.log('Facilities loaded from localStorage.');
        self.root = new facilityNode(facilities);
        ps.publish('loading:complete');
    } else {
        console.log('Facilities not found in localStorage, try Revisit');
        self.fetchFromRevisit()
        .done(function(data) {
            console.log('Recieved data from Revisit, traversing...');
            self.total = data.total;
            self.root = new facilityNode(data.facilities);
            self.storeTreeToLocalStorage();
            // reconciliation happens after saving to pouch (async)
        })
        .fail(function() {
            console.log('Failed to load from Revisit.');
            self.root = null;
            // since we haven't been able to contact Revisit, we can't
            // know where in the quadtree any newly added facilities
            // should go. We'll save these facilities separately, and
            // try to reconcile them with Revisit later.
            ps.publish('revisit:error:no_facilities');
        })
        .always(function() {
            // The ajax request was attempted whether we have network or not,
            // so we should publish the loading:complete event on success or fail.
            ps.publish('loading:complete');
        });
    }
    // Revisit ajax req
    // $.ajax({
    //     url: config.revisit_url,
    //     data: {
    //         within: self.nlat + ',' + self.wlng + ',' + self.slat + ',' + self.elng,
    //         compressed: true
    //         //fields: 'name,uuid,coordinates,properties:sector',
    //     },
    //     success: function(data) {
    //         console.log('Recieved Data traversing');
    //         self.total = data.total;
    //         self.root = new facilityNode(data.facilities);
    //         self.storeTreeToLocalStorage();
    //         // reconciliation happens after saving to pouch (async)
    //         // self.reconcileFacilities();
    //     },
    //     error: function() {
    //         console.log('Failed to retrieve data, attempting to build from local');
    //         var facilities = self.loadTreeFromLocalStorage();
    //         if (facilities) {
    //             console.log('--> facilities loaded from localStorage.');
    //             self.root = new facilityNode(facilities);
    //             ps.publish('revisit:error:local_facilities');
    //         } else {
    //             console.log('//> facilities not found in localStorage.');
    //             self.root = null;
    //             // since we haven't been able to contact Revisit, we can't
    //             // know where in the quadtree any newly added facilities
    //             // should go. We'll save these facilities separately, and
    //             // try to reconcile them with Revisit later.
    //             ps.publish('revisit:error:no_facilities');
    //         }
    //     },
    //     complete: function() {
    //         // The ajax request attempted whether we have network or not,
    //         // so we should publish the loading:complete event on success or fail.
    //         ps.publish('loading:complete');
    //     }
    // });

    console.log(config.revisit_url, '?within=',
            self.nlat + ',' + self.wlng + ',' + self.slat + ',' + self.elng,
            '&compressed');

};

FacilityTree.prototype.fetchFromRevisit = function() {
    var self = this;
    // Revisit ajax req
    return $.ajax({
        url: config.revisit_url,
        data: {
            within: self.nlat + ',' + self.wlng + ',' + self.slat + ',' + self.elng,
            compressed: true
            //fields: 'name,uuid,coordinates,properties:sector',
        }
    });
};

/**
 * If there are orphan facilities (created when Revisit was down), add them to the tree.
 */
FacilityTree.prototype.reconcileFacilities = function() {
    console.log('reconcileFacilities');
    var self = this;

    if (!localStorage['unsynced_facilities']) return;

    var orphanFacilities = self.getOrphanFacilities();
    console.log('orphanFacilities: ', orphanFacilities);

    if (orphanFacilities && orphanFacilities.length) {
        orphanFacilities.forEach(function(fac) {
            self.addFacility(fac.facilityData.lat, fac.facilityData.lng, fac.facilityData);
            fac.in_tree = true;
        });
    }

    self.storeUnsyncedFacilities(orphanFacilities);
};

/**
 * Get the orphan facilities (i.e. facilities created outside the quadtree due to Revisit being down)
 * @param  {Boolean} formatted If true, return formatted facility data.
 * @return {Array}  An array of either facility wrappers (data + meta) or formatted facility objects
 */
FacilityTree.prototype.getOrphanFacilities = function(formatted) {
    var self = this;
    var unsyncedFacilities = localStorage['unsynced_facilities'] ? JSON.parse(localStorage['unsynced_facilities']) : [];
    var orphanFacilities = _.filter(unsyncedFacilities, function(fac) {
        return fac.in_tree === false;
    });

    if (formatted === true) {
        orphanFacilities = orphanFacilities.map(function(fac) {
            return self.formattedFacility(fac.facilityData);
        });
    }

    return orphanFacilities;
};

FacilityTree.prototype.storeUnsyncedFacilities = function(facilities) {
    var unsyncedFacilities = localStorage['unsynced_facilities'] ? JSON.parse(localStorage['unsynced_facilities']) : [];
    _.extend(unsyncedFacilities, facilities);
    localStorage['unsynced_facilities'] = JSON.stringify(unsyncedFacilities);
};

/* Store facility tree in localStorage without children */
FacilityTree.prototype.storeTreeToLocalStorage = function() {
    // Data is never stored in object, stringifiying root should be sufficient
    var facilities = JSON.parse(localStorage['facilities'] || '{}');
    facilities[this.id] = this.root;
    localStorage['facilities'] = JSON.stringify(facilities);
};

/* Load facility tree from localStorage */
FacilityTree.prototype.loadTreeFromLocalStorage = function() {
    var facilities = JSON.parse(localStorage['facilities'] || '{}');
    return facilities[this.id];
};


FacilityTree.prototype._getNNode = function(lat, lng, node) {
    var self = this,
        cnode;

    // Maybe I'm a leaf?
    if (node.isLeaf) {
        return node;
    }

    if (node.count > 0) {
        // NW
        if (node.children.wn && node.children.wn.within(lat, lng)) {
            cnode = self._getNNode(lat, lng, node.children.wn);
            if (cnode)
                return cnode;
        }

        // NE
        if (node.children.en && node.children.en.within(lat, lng)) {
            cnode = self._getNNode(lat, lng, node.children.en);
            if (cnode)
                return cnode;
        }

        // SW
        if (node.children.ws && node.children.ws.within(lat, lng)) {
            cnode = self._getNNode(lat, lng, node.children.ws);
            if (cnode)
                return cnode;
        }

        // SE
        if (node.children.es && node.children.es.within(lat, lng)) {
            cnode = self._getNNode(lat, lng, node.children.es);
            if (cnode)
                return cnode;
        }
    }
};

/*
 * Get Nearest node to lat, lng
 */
FacilityTree.prototype.getNNode = function(lat, lng) {
    var self = this;

    if (!self.root.within(lat, lng))
        return null;

    var node = self._getNNode(lat, lng, self.root);
    console.log('node: ', node.center[1], node.center[0], 'distance from center', node.distance(lat,lng));

    return node;
};

FacilityTree.prototype._getRNodes = function(nlat, wlng, slat, elng, node) {
    var self = this;

    // Maybe I'm a leaf?
    if (node.isLeaf) {
        return [node];
    }

    var nodes = [];
    if (node.count > 0) {
        // NW
        if (node.children.wn && node.children.wn.crossesBound(nlat, wlng, slat, elng)) {
            nodes = nodes.concat(self._getRNodes(nlat, wlng, slat, elng, node.children.wn));
        }

        // NE
        if (node.children.en && node.children.en.crossesBound(nlat, wlng, slat, elng)) {
            nodes = nodes.concat(self._getRNodes(nlat, wlng, slat, elng, node.children.en));
        }

        // SW
        if (node.children.ws && node.children.ws.crossesBound(nlat, wlng, slat, elng)) {
            nodes = nodes.concat(self._getRNodes(nlat, wlng, slat, elng, node.children.ws));
        }

        // SE
        if (node.children.es && node.children.es.crossesBound(nlat, wlng, slat, elng)) {
            nodes = nodes.concat(self._getRNodes(nlat, wlng, slat, elng, node.children.es));
        }
    }

    return nodes;
};

/*
 * Get all nodes that cross the box defined by nlat, wlng, slat, elng
 */
FacilityTree.prototype.getRNodesBox = function(nlat, wlng, slat, elng) {
    var self = this;

    if (!self.root.crossesBound(nlat, wlng, slat, elng))
        return null;

    var nodes = self._getRNodes(nlat, wlng, slat, elng, self.root);
    return nodes;
};

/*
 * Get all nodes that cross the circle defined by lat, lng and radius r
 */
FacilityTree.prototype.getRNodesRad = function(lat, lng, r) {
    console.log('getRNodesRad');
    var self = this;

    var R = 6378137;
    var dlat = r/R;
    var dlng = r/(R*Math.cos(Math.PI*lat/180));

    var nlat = lat + dlat * 180/Math.PI;
    var wlng = lng - dlng * 180/Math.PI;
    var slat = lat - dlat * 180/Math.PI;
    var elng = lng + dlng * 180/Math.PI;

    if (!self.root || !self.root.crossesBound(nlat, wlng, slat, elng))
        return null;

    var nodes = self._getRNodes(nlat, wlng, slat, elng, self.root);
    return nodes;
};

/*
 * Returns a promise with n nearest sorted facilities
 * pouchDB forces the async virus to spread to all getFacilities function calls :(
 *
 * XXX: Basically the only function that matters
 */
FacilityTree.prototype.getNNearestFacilities = function(lat, lng, r, n) {
    console.log('getNNearestFacilities');
    var self = this;
    var d = $.Deferred(); // Sorted facilities deferred (i.e. promise)

    // Calculates meter distance between facilities and center of node
    function dist(coordinates, clat, clng) {
        var lat = coordinates[1];
        var lng = coordinates[0];

        // console.log(coordinates, clat, clng);

        var R = 6371000;
        var e = clat * Math.PI/180;
        var f = lat * Math.PI/180;
        var g = (lat - clat) * Math.PI/180;
        var h = (lng - clng) * Math.PI/180;

        var a = Math.sin(g/2) * Math.sin(g/2) +
               Math.cos(e) * Math.cos(f) *
               Math.sin(h/2) * Math.sin(h/2);

        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    var orphanFacilities = self.getOrphanFacilities(true);
    // Each Pouch promise writes into nodeFacilities
    var nodeFacilities = orphanFacilities.length ? [orphanFacilities] : [];
    // Pouch db retrival and sorting promise
    var nodeFacilitiesDfd = $.Deferred();

    // Sort X Nodes Data
    // var nodes = self.root ? self.getRNodesRad(lat, lng, r) : [];
    var nodes = self.getRNodesRad(lat, lng, r);

    console.log('nodes: ', nodes);

    // Merge X Nodes Sorted Data AFTER promise resolves (read this second)
    nodeFacilitiesDfd.done(function() {
        console.log('sorting facilities');
        var facilities = [];
        while(n > 0 && nodeFacilities.length > 0) {
            // filter out nodes which have zero facilities
            nodeFacilities = nodeFacilities.filter(function(facilities) {
                return facilities.length;
            });

            var tops = [];
            nodeFacilities.forEach(function(facilities, idx) {
                console.log('facilities[0]: ', facilities[0]);
                tops.push({'fac': facilities[0], 'idx': idx});
            });

            tops.sort(function (nodeA, nodeB) {
                var lengthA = dist(nodeA.fac.coordinates, lat, lng);
                var lengthB = dist(nodeB.fac.coordinates, lat, lng);
                return (lengthA - lengthB);
            });

            //XXX: Should terminate early if this is the case instead
            if (tops.length > 0)
                facilities.push(nodeFacilities[tops[0].idx].shift());

            n--;
        }

        // Append distance to each facility
        facilities.forEach(function(facility) {
            facility.distance = dist(facility.coordinates, lat, lng);
        });

        return d.resolve(facilities);
    });

    // If nodes isn't null and isn't empty (i.e. we were able to fetch Facilities from Revisit)
    // loop through the nodes and add the sorted facilities to the nodeFacilities array
    if (nodes && nodes.length !== 0) {
        // Sort each nodes facilities (read this first)
        nodes.forEach(function(node) {
            node.getFacilities().done(function(facilities) {

                console.log('facilities: ', facilities);

                facilities.sort(function (facilityA, facilityB) {
                    var lengthA = dist(facilityA.coordinates, lat, lng);
                    var lengthB = dist(facilityB.coordinates, lat, lng);
                    return (lengthA - lengthB);
                });

                nodeFacilities.push(facilities);
                var endLength = orphanFacilities.length ? nodes.length + 1 : nodes.length;
                console.log('Current facilities length', nodeFacilities.length, nodes.length, endLength);
                if (nodeFacilities.length === endLength) {
                    nodeFacilitiesDfd.resolve();
                }
            });
        });
    } else {
        // otherwise simply resolve, kicking off sorting for orphanFacilities, if the are present
        console.log('resolving...');
        nodeFacilitiesDfd.resolve();
    }



    return d;
};

FacilityTree.prototype.print = function() {
    this.root.print();
};


FacilityTree.prototype._getLeaves = function(node) {
    var self = this;

    // Check if this is a leaf
    if (node.isLeaf)
        return [node];

    // Otherwise check all children
    var nodes = [];
    if (node.count > 0) {
        // NW
        if (node.children.wn)
            nodes = nodes.concat(self._getLeaves(node.children.wn));

        // NE
        if (node.children.en)
            nodes = nodes.concat(self._getLeaves(node.children.en));

        // SW
        if (node.children.ws)
            nodes = nodes.concat(self._getLeaves(node.children.ws));

        // SE
        if (node.children.es)
            nodes = nodes.concat(self._getLeaves(node.children.es));
    }

    return nodes;
};

/*
 * Return all leaf nodes of the facility
 * ie. any node with isLeaf flag set to true
 */
FacilityTree.prototype.getLeaves = function() {
    var self = this;
    return self._getLeaves(self.root);
};

/*
 * Helper method to calculate compressed size
 * (Sums up values in all leaves)
 */
FacilityTree.prototype.getCompressedSize = function() {
    var self = this;
    var leaves = self._getLeaves(self.root);
    return leaves.reduce(function(sum, node) {
        return node.compressedSize + sum;
    }, 0);
};

/*
 * Helper method to calculate uncompressed size
 * (Sums up values in all leaves)
 */
FacilityTree.prototype.getUncompressedSize = function() {
    var self = this;
    var leaves = self._getLeaves(self.root);
    return leaves.reduce(function(sum, node) {
        return node.uncompressedSize + sum;
    }, 0);
};

/*
 * Helper method to calculate total facility count
 * (Sums up values in all leaves)
 */
FacilityTree.prototype.getCount = function() {
    var self = this;
    var leaves = self._getLeaves(self.root);
    return leaves.reduce(function(sum, node) {
        return node.count + sum;
    }, 0);
};

/*
 * Helper method for transforming facility data into Revisit format
 *
 * @facilityData: Facility data in dokomoforms submission form
 */
FacilityTree.prototype.formattedFacility = function(facilityData) {
    var facility = {};
    facility.uuid = facilityData.facility_id;
    facility.name = facilityData.facility_name;
    facility.properties = {
        sector: facilityData.facility_sector,
        grid_power: !!facilityData.grid_power,
        improved_water_supply: !!facilityData.improved_water_supply,
        improved_sanitation: !!facilityData.improved_sanitation
    };
    facility.coordinates = [facilityData.lng, facilityData.lat];
    console.log('formattedFacility', facility);
    return facility;
};

/*
 * Adds a facility to local copy of facilityTree
 *
 * @lat, lng: location to add facility
 * @facilityData: Facility information to add into tree
 * @formatted: if facilityData is already in correct format (will be converted if not set)
 */
FacilityTree.prototype.addFacility = function(lat, lng, facilityData, formatted) {
    var self = this;
    var leaf = self.getNNode(lat, lng);

    formatted = Boolean(formatted) || false;
    console.log('formatted?', formatted);
    var facility = formatted ? facilityData : self.formattedFacility(facilityData);

    console.log('Before', leaf.count, leaf.uncompressedSize, leaf.compressedSize);
    leaf.getFacilities()
        .done(function(facilities) {
            console.log('Got facilities:', facilities.length);
            facilities.push(facility);
            var facilitiesStr = JSON.stringify(facilities);
            var facilitiesLZ = [LZString.compressToUTF16(facilitiesStr)]; // mongoose_quadtree does this in [] for a reason i do not remember
            leaf.setFacilities(facilitiesLZ);

            leaf.count++;
            leaf.uncompressedSize = facilitiesStr.length || 0;
            leaf.compressedSize = facilitiesLZ.length || 0;
            console.log('After', leaf.count, leaf.uncompressedSize, leaf.compressedSize);

        })
        .fail(function(err) {
            if (err) {
                console.log('Failed to add facility', err);
            }
        });
};

/*
 * Post facility to Revisit
 *
 * @facilityData: Facility information to send to revisit
 * @successCB: What to do on succesful post
 * @errorCB: What to do on unsuccesful post
 * @formatted: if facilityData is already in correct format (will be converted if not set)
 */
FacilityTree.prototype.postFacility = function(facilityData, successCB, errorCB, formatted) {
    var self = this;

    formatted = Boolean(formatted) || false;
    var facility = formatted ? facilityData : self.formattedFacility(facilityData);

    console.log('formatted?', formatted, facility);

    $.ajax({
        url: config.revisit_url,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(facility),
        processData: false,
        dataType: 'json',
        success: successCB,

        headers: {
            'Authorization': 'Basic ' + btoa('dokomoforms' + ':' + 'password')
             //XXX Obsecure basic auth in bundlejs somehow? Force https after?
        },

        error: errorCB
    });
};

/*
 * Compute lat lng distance from center {lat, lng}
 *
 * XXX function is copied in a few places with mild alterations, prob should be merged
 */
FacilityTree.prototype.distance = function(lat, lng, center) {
    var R = 6371000; // metres
    var e = center.lat * Math.PI/180;
    var f = lat * Math.PI/180;
    var g = (lat - center.lat) * Math.PI/180;
    var h = (lng - center.lng) * Math.PI/180;

    var a = Math.sin(g/2) * Math.sin(g/2) +
            Math.cos(e) * Math.cos(f) *
            Math.sin(h/2) * Math.sin(h/2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
};

//Nigeria
//var nlat = 8;
//var wlng = -8;
//var slat = -22;
//var elng = 40;

// NYC
//var nlat = 85;
//var wlng = -72;
//var slat = -85
//var elng = -74;

// World
//var nlat = 85;
//var wlng = -180;
//var slat = -85;
//var elng = 180;

//window.tree = tree;
//var tree = new FacilityTree(nlat, wlng, slat, elng);
//var nyc = {lat: 40.80690, lng:-73.96536}
//window.nyc = nyc;

//tree.getCompressedSize() / 1048576
//tree.getNNearestFacilities(7.353078, 5.118915, 500, 10)
//tree.getNNearestFacilities(40.80690, -73.96536, 500, 10)
//tree.getCompressedSize()/tree.getUncompressedSize()
//tree.getRNodesRad(40.80690, -73.96536, 500)

module.exports = FacilityTree;
