import { displayName, getStyle } from '../util/index';
import { Entity } from '../core/index';
import { pathLength } from '../geo/index';
import rbush from 'rbush';

export function Labels(projection, context) {
    var path = d3.geo.path().projection(projection);

    // Replace with dict and iterate over entities tags instead?
    var label_stack = [
        ['line', 'aeroway'],
        ['line', 'highway'],
        ['line', 'railway'],
        ['line', 'waterway'],
        ['area', 'aeroway'],
        ['area', 'amenity'],
        ['area', 'building'],
        ['area', 'historic'],
        ['area', 'leisure'],
        ['area', 'man_made'],
        ['area', 'natural'],
        ['area', 'shop'],
        ['area', 'tourism'],
		['area', 'indoor'],
		['area', 'buildingpart'],
        ['point', 'aeroway'],
        ['point', 'amenity'],
        ['point', 'building'],
        ['point', 'historic'],
        ['point', 'leisure'],
        ['point', 'man_made'],
        ['point', 'natural'],
        ['point', 'shop'],
        ['point', 'tourism'],
        ['line', 'name'],
        ['area', 'name'],
        ['point', 'name']
    ];

    var default_size = 12;

    var font_sizes = label_stack.map(function(d) {
        var style = getStyle('text.' + d[0] + '.tag-' + d[1]),
            m = style && style.cssText.match('font-size: ([0-9]{1,2})px;');
        if (m) return parseInt(m[1], 10);

        style = getStyle('text.' + d[0]);
        m = style && style.cssText.match('font-size: ([0-9]{1,2})px;');
        if (m) return parseInt(m[1], 10);

        return default_size;
    });

    var iconSize = 18;

    var pointOffsets = [
        [15, -11, 'start'], // right
        [10, -11, 'start'], // unused right now
        [-15, -11, 'end']
    ];

    var lineOffsets = [50, 45, 55, 40, 60, 35, 65, 30, 70, 25,
        75, 20, 80, 15, 95, 10, 90, 5, 95];


    var noIcons = ['building', 'landuse', 'natural'];
    function blacklisted(preset) {
        return _.some(noIcons, function(s) {
            return preset.id.indexOf(s) >= 0;
        });
    }

    function get(array, prop) {
        return function(d, i) { return array[i][prop]; };
    }

    var textWidthCache = {};

    function textWidth(text, size, elem) {
        var c = textWidthCache[size];
        if (!c) c = textWidthCache[size] = {};

        if (c[text]) {
            return c[text];

        } else if (elem) {
            c[text] = elem.getComputedTextLength();
            return c[text];

        } else {
            var str = encodeURIComponent(text).match(/%[CDEFcdef]/g);
            if (str === null) {
                return size / 3 * 2 * text.length;
            } else {
                return size / 3 * (2 * text.length + str.length);
            }
        }
    }

    function drawLineLabels(group, entities, filter, classes, labels) {
        var texts = group.selectAll('text.' + classes)
            .filter(filter)
            .data(entities, Entity.key);

        texts.enter()
            .append('text')
            .attr('class', function(d, i) { return classes + ' ' + labels[i].classes + ' ' + d.id; })
            .append('textPath')
            .attr('class', 'textpath');


        texts.selectAll('.textpath')
            .filter(filter)
            .data(entities, Entity.key)
            .attr({
                'startOffset': '50%',
                'xlink:href': function(d) { return '#labelpath-' + d.id; }
            })
            .text(displayName);

        texts.exit().remove();
    }

    function drawLinePaths(group, entities, filter, classes, labels) {
        var halos = group.selectAll('path')
            .filter(filter)
            .data(entities, Entity.key);

        halos.enter()
            .append('path')
            .style('stroke-width', get(labels, 'font-size'))
            .attr('id', function(d) { return 'labelpath-' + d.id; })
            .attr('class', classes);

        halos.attr('d', get(labels, 'lineString'));

        halos.exit().remove();
    }

    function drawPointLabels(group, entities, filter, classes, labels) {
        var texts = group.selectAll('text.' + classes)
            .filter(filter)
            .data(entities, Entity.key);

        texts.enter()
            .append('text')
            .attr('class', function(d, i) { return classes + ' ' + labels[i].classes + ' ' + d.id; });

        texts.attr('x', get(labels, 'x'))
            .attr('y', get(labels, 'y'))
            .style('text-anchor', get(labels, 'textAnchor'))
            .text(displayName)
            .each(function(d, i) { textWidth(displayName(d), labels[i].height, this); });

        texts.exit().remove();
        return texts;
    }

    function drawAreaLabels(group, entities, filter, classes, labels) {
        entities = entities.filter(hasText);
        labels = labels.filter(hasText);
        return drawPointLabels(group, entities, filter, classes, labels);

        function hasText(d, i) {
            return labels[i].hasOwnProperty('x') && labels[i].hasOwnProperty('y');
        }
    }

    function drawAreaIcons(group, entities, filter, classes, labels) {
        var icons = group.selectAll('use')
            .filter(filter)
            .data(entities, Entity.key);

        icons.enter()
            .append('use')
            .attr('class', 'icon areaicon')
            .attr('width', '18px')
            .attr('height', '18px');

        icons.attr('transform', get(labels, 'transform'))
            .attr('xlink:href', function(d) {
                var icon = context.presets().match(d, context.graph()).icon;
                return '#' + icon + (icon === 'hairdresser' ? '-24': '-18');    // workaround: maki hairdresser-18 broken?
            });


        icons.exit().remove();
    }

    function reverse(p) {
        var angle = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]);
        return !(p[0][0] < p[p.length - 1][0] && angle < Math.PI/2 && angle > -Math.PI/2);
    }

    function lineString(nodes) {
        return 'M' + nodes.join('L');
    }

    function subpath(nodes, from, to) {
        function segmentLength(i) {
            var dx = nodes[i][0] - nodes[i + 1][0];
            var dy = nodes[i][1] - nodes[i + 1][1];
            return Math.sqrt(dx * dx + dy * dy);
        }

        var sofar = 0,
            start, end, i0, i1;
        for (var i = 0; i < nodes.length - 1; i++) {
            var current = segmentLength(i);
            var portion;
            if (!start && sofar + current >= from) {
                portion = (from - sofar) / current;
                start = [
                    nodes[i][0] + portion * (nodes[i + 1][0] - nodes[i][0]),
                    nodes[i][1] + portion * (nodes[i + 1][1] - nodes[i][1])
                ];
                i0 = i + 1;
            }
            if (!end && sofar + current >= to) {
                portion = (to - sofar) / current;
                end = [
                    nodes[i][0] + portion * (nodes[i + 1][0] - nodes[i][0]),
                    nodes[i][1] + portion * (nodes[i + 1][1] - nodes[i][1])
                ];
                i1 = i + 1;
            }
            sofar += current;

        }
        var ret = nodes.slice(i0, i1);
        ret.unshift(start);
        ret.push(end);
        return ret;

    }

    function hideOnMouseover() {
        var layers = d3.select(this)
            .selectAll('.layer-label, .layer-halo');

        layers.selectAll('.proximate')
            .classed('proximate', false);

        var mouse = context.mouse(),
            pad = 50,
            bbox = { minX: mouse[0] - pad, minY: mouse[1] - pad, maxX: mouse[0] + pad, maxY: mouse[1] + pad },
            ids = _.map(rtree.search(bbox), 'id');

        if (!ids.length) return;
        layers.selectAll('.' + ids.join(', .'))
            .classed('proximate', true);
    }

    var rtree = rbush(),
        bboxes = {};

    function drawLabels(surface, graph, entities, filter, dimensions, fullRedraw) {
        var hidePoints = !surface.selectAll('.node.point').node();

        var labelable = [], i, k, entity;
        for (i = 0; i < label_stack.length; i++) labelable.push([]);

        if (fullRedraw) {
            rtree.clear();
            bboxes = {};
        } else {
            for (i = 0; i < entities.length; i++) {
                rtree.remove(bboxes[entities[i].id]);
            }
        }

        // Split entities into groups specified by label_stack
        for (i = 0; i < entities.length; i++) {
            entity = entities[i];
            var geometry = entity.geometry(graph);

            if (geometry === 'vertex')
                continue;
            if (hidePoints && geometry === 'point')
                continue;

            var preset = geometry === 'area' && context.presets().match(entity, graph),
                icon = preset && !blacklisted(preset) && preset.icon;

            if (!icon && !displayName(entity))
                continue;

            for (k = 0; k < label_stack.length; k++) {
                if (geometry === label_stack[k][0] && entity.tags[label_stack[k][1]]) {
                    labelable[k].push(entity);
                    break;
                }
            }
        }

        var positions = {
            point: [],
            line: [],
            area: []
        };

        var labelled = {
            point: [],
            line: [],
            area: []
        };

        // Try and find a valid label for labellable entities
        for (k = 0; k < labelable.length; k++) {
            var font_size = font_sizes[k];
            for (i = 0; i < labelable[k].length; i++) {
                entity = labelable[k][i];
                var name = displayName(entity),
                    width = name && textWidth(name, font_size),
                    p;
                if (entity.geometry(graph) === 'point') {
                    p = getPointLabel(entity, width, font_size);
                } else if (entity.geometry(graph) === 'line') {
                    p = getLineLabel(entity, width, font_size);
                } else if (entity.geometry(graph) === 'area') {
                    p = getAreaLabel(entity, width, font_size);
                }
                if (p) {
                    p.classes = entity.geometry(graph) + ' tag-' + label_stack[k][1];
                    positions[entity.geometry(graph)].push(p);
                    labelled[entity.geometry(graph)].push(entity);
                }
            }
        }

        function getPointLabel(entity, width, height) {
            var coord = projection(entity.loc),
                m = 5,  // margin
                offset = pointOffsets[0],
                p = {
                    height: height,
                    width: width,
                    x: coord[0] + offset[0],
                    y: coord[1] + offset[1],
                    textAnchor: offset[2]
                };
            var bbox = { minX: p.x - m, minY: p.y - m, maxX: p.x + width + m, maxY: p.y + height + m };
            if (tryInsert(bbox, entity.id)) return p;
        }


        function getLineLabel(entity, width, height) {
            var nodes = _.map(graph.childNodes(entity), 'loc').map(projection),
                length = pathLength(nodes);
            if (length < width + 20) return;

            for (var i = 0; i < lineOffsets.length; i++) {
                var offset = lineOffsets[i],
                    middle = offset / 100 * length,
                    start = middle - width/2;
                if (start < 0 || start + width > length) continue;
                var sub = subpath(nodes, start, start + width),
                    rev = reverse(sub),
                    bbox = {
                        minX: Math.min(sub[0][0], sub[sub.length - 1][0]) - 10,
                        minY: Math.min(sub[0][1], sub[sub.length - 1][1]) - 10,
                        maxX: Math.max(sub[0][0], sub[sub.length - 1][0]) + 20,
                        maxY: Math.max(sub[0][1], sub[sub.length - 1][1]) + 30
                    };
                if (rev) sub = sub.reverse();
                if (tryInsert(bbox, entity.id)) return {
                    'font-size': height + 2,
                    lineString: lineString(sub),
                    startOffset: offset + '%'
                };
            }
        }

        function getAreaLabel(entity, width, height) {
            var centroid = path.centroid(entity.asGeoJSON(graph, true)),
                extent = entity.extent(graph),
                entitywidth = projection(extent[1])[0] - projection(extent[0])[0],
                bbox;

            if (isNaN(centroid[0]) || entitywidth < 20) return;

            var iconX = centroid[0] - (iconSize/2),
                iconY = centroid[1] - (iconSize/2),
                textOffset = iconSize + 5;

            var p = {
                transform: 'translate(' + iconX + ',' + iconY + ')'
            };

            if (width && entitywidth >= width + 20) {
                p.x = centroid[0];
                p.y = centroid[1] + textOffset;
                p.textAnchor = 'middle';
                p.height = height;
                bbox = { minX: p.x - width/2, minY: p.y, maxX: p.x + width/2, maxY: p.y + height + textOffset };
            } else {
                bbox = { minX: iconX, minY: iconY, maxX: iconX + iconSize, maxY: iconY + iconSize };
            }

            if (tryInsert(bbox, entity.id)) return p;

        }

        function tryInsert(bbox, id) {
            // Check that label is visible
            if (bbox.minX < 0 || bbox.minY < 0 || bbox.maxX > dimensions[0] || bbox.maxY > dimensions[1]) return false;
            var v = rtree.search(bbox).length === 0;
            if (v) {
                bbox.id = id;
                rtree.insert(bbox);
                bboxes[id] = bbox;
            }
            return v;
        }

        var label = surface.selectAll('.layer-label'),
            halo = surface.selectAll('.layer-halo');

        // points
        drawPointLabels(label, labelled.point, filter, 'pointlabel', positions.point);
        drawPointLabels(halo, labelled.point, filter, 'pointlabel-halo', positions.point);

        // lines
        drawLinePaths(halo, labelled.line, filter, '', positions.line);
        drawLineLabels(label, labelled.line, filter, 'linelabel', positions.line);
        drawLineLabels(halo, labelled.line, filter, 'linelabel-halo', positions.line);

        // areas
        drawAreaLabels(label, labelled.area, filter, 'arealabel', positions.area);
        drawAreaLabels(halo, labelled.area, filter, 'arealabel-halo', positions.area);
        drawAreaIcons(label, labelled.area, filter, 'arealabel-icon', positions.area);

        // debug
        var showDebug = context.getDebug('collision');
        var debug = label.selectAll('.layer-label-debug')
            .data(showDebug ? [true] : []);

        debug.enter()
            .append('g')
            .attr('class', 'layer-label-debug');

        debug.exit()
            .remove();

        if (showDebug) {
            var gj = rtree.all().map(function(d) {
                return { type: 'Polygon', coordinates: [[
                    [d.minX, d.minY],
                    [d.maxX, d.minY],
                    [d.maxX, d.maxY],
                    [d.minX, d.maxY],
                    [d.minX, d.minY]
                ]]};
            });

            var debugboxes = debug.selectAll('.debug').data(gj);

            debugboxes.enter()
                .append('path')
                .attr('class', 'debug yellow');

            debugboxes.exit()
                .remove();

            debugboxes
                .attr('d', d3.geo.path().projection(null));
        }
    }

    drawLabels.supersurface = function(supersurface) {
        supersurface
            .on('mousemove.hidelabels', hideOnMouseover)
            .on('mousedown.hidelabels', function () {
                supersurface.on('mousemove.hidelabels', null);
            })
            .on('mouseup.hidelabels', function () {
                supersurface.on('mousemove.hidelabels', hideOnMouseover);
            });
    };

    return drawLabels;
}
