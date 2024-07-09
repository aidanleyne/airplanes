document.addEventListener('DOMContentLoaded', function() {
    fetch('data/output.json')
        .then(response => response.json())
        .then(data => {
            const graph = processData(data);
            createGraph(graph);
        })
        .catch(error => {
            console.error("Error fetching or processing JSON file:", error);
        });
});

function processData(data) {
    const nodes = new Map();
    const links = [];

    if (data.companies) {
        data.companies.forEach(company => {
            nodes.set(company.id, { id: company.id, group: company.type });
        });
    }

    if (data.aircraft) {
        data.aircraft.forEach(aircraft => {
            nodes.set(aircraft.id, { id: aircraft.id, group: 'aircraft' });
            links.push({ source: aircraft.manufacturer, target: aircraft.id, type: 'manufactures' });
        });
    }

    if (data.variants) {
        data.variants.forEach(variant => {
            nodes.set(variant.id, { id: variant.id, group: 'variant' });
            links.push({ source: variant.parent, target: variant.id, type: 'variant' });
        });
    }

    if (data.engine) {
        data.engine.forEach(engine => {
            nodes.set(engine.id, { id: engine.id, group: 'engine' });
            links.push({ source: engine.manufacturer, target: engine.id, type: 'manufactures' });
            engine.powers.split(', ').forEach(variant => {
                if (nodes.has(variant)) {
                    links.push({ source: engine.id, target: variant, type: 'powers' });
                } else {
                    console.warn(`Variant ${variant} not found for engine ${engine.id}`);
                }
            });
        });
    }

    console.log("Nodes: ", nodes);
    console.log("Links: ", links);

    return {
        nodes: Array.from(nodes.values()),
        links: links
    };
}

function createGraph(graph) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const margin = 20;

    const svg = d3.select("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const container = svg.append("g")
        .attr("class", "container");

    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", handleZoom);

    svg.call(zoom);

    function handleZoom(event) {
        container.attr("transform", event.transform);
    }

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const simulation = d3.forceSimulation(graph.nodes)
        .force("link", d3.forceLink(graph.links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(20))
        .on("tick", ticked);

    const link = container.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
        .attr("stroke-width", 2)
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6);

    const node = container.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(graph.nodes)
        .enter().append("g");

    node.append("circle")
        .attr("r", 10)
        .attr("fill", d => color(d.group))
        .call(drag(simulation));

    node.append("text")
        .text(d => d.id)
        .attr('x', 6)
        .attr('y', 3);

    node.append("title")
        .text(d => d.id);

    function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .each(stayInBounds);
    }

    function stayInBounds(d) {
        d.x = Math.max(margin, Math.min(width - margin, d.x));
        d.y = Math.max(margin, Math.min(height - margin, d.y));
    }

    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    // Fit the graph to the viewbox
    const bounds = container.node().getBBox();
    const fullWidth = bounds.width;
    const fullHeight = bounds.height;
    const midX = bounds.x + fullWidth / 2;
    const midY = bounds.y + fullHeight / 2;

    const initialScale = 0.85 / Math.max(fullWidth / width, fullHeight / height);
    const initialTranslate = [width / 2 - initialScale * midX, height / 2 - initialScale * midY];

    svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(initialTranslate[0], initialTranslate[1]).scale(initialScale));
}
