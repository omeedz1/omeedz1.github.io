let allData = []
let xVar, yVar, sizeVar, targetYear
let xScale, yScale, sizeScale
let crimesByType;
let hidden = new Set(); 
let focused = null;
const margin = {top: 40, right: 300, bottom: 60, left: 80};
const width = 1400 - margin.left - margin.right;
const height = 800 - margin.top - margin.bottom;
const color = d3.scaleOrdinal().range([]);

// Create SVG

function getVisibleYMax() {
    const visibleCrimes = Array.from(crimesByType)
        .filter(([type]) => !hidden.has(type))
        .filter(([type]) => focused === null || focused === type); 
    
    return d3.max(visibleCrimes, ([type, values]) => 
        d3.max(values, d => d.count)
    );
}
    

const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);


window.addEventListener('load', init);

function init(){
    d3.csv("./data/grouped_crime_by_year_and_type.csv", 
        function(d){
        return {  
        // Besides converting the types, we also simpilify the variable names here. 
        year: +d["Year"],
        type: d["Primary Type"],
        count: +d["Count"]
     }
    })
        .then(data => {
            console.log(data) // Check the structure in the console
            allData = data // Save the processed data

            crimesByType = d3.group(allData, d => d.type);

            const types = Array.from(crimesByType.entries())
                .map(([type, values]) => ({
                    type,
                    total: d3.sum(values, d => d.count)
                }));
            types.sort((a, b) => d3.descending(a.total, b.total));
            const sortedTypes = types.map(d => d.type);

            const palette = [
                ...d3.schemeTableau10,
                ...d3.schemePaired,
                ...d3.schemeDark2
            ];
            
            color.domain(sortedTypes).range(palette);

            updateAxes()
            updateVis()
            addLegend()
            })
        .catch(error => console.error('Error loading data:', error));
        const introBox = new bootstrap.Modal(document.getElementById('introModal'));
        introBox.show();
}


function updateAxes(){
    // Draws the x-axis and y-axis
    // Adds ticks, labels, and makes sure everything lines up nicely

    // X scale: years
    xScale = d3.scaleLinear()
        .domain(d3.extent(allData, d => d.year))
        .range([0, width]);

    // Y scale: counts
    yScale = d3.scaleLinear()
        .domain([0, getVisibleYMax()])
        .range([height, 0]);

    svg.selectAll(".x-axis").remove();
    svg.selectAll(".y-axis").remove();
    svg.selectAll(".y-grid").remove();
    svg.selectAll(".x-grid").remove();
    svg.selectAll(".labels").remove();

    // X axis
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

    // Y axis
    
    svg.append("g")
        .attr("class", "y-axis")
        .transition().duration(500)
        .call(d3.axisLeft(yScale));

    // X grid lines
    svg.append("g")
        .attr("class", "x-grid")
        .call(d3.axisBottom(xScale)
        .tickSize(height)   // extends ticks across the height
        .tickFormat("")     // hide labels
    );

    // Y grid lines
    svg.append("g")
        .attr("class", "y-grid")
        .call(d3.axisLeft(yScale)
        .tickSize(-width)   // extends ticks across the width
        .tickFormat("")     // hide labels
    );

    // X axis label 
    svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .text("Year") 
    .attr('class', 'labels')

    svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 30)
    .attr("text-anchor", "middle")
    .text("Reported Incidents") 
    .attr('class', 'labels')



}

function updateVis(){
    const visibleCrimes = Array.from(crimesByType).filter(([type]) => !hidden.has(type));
    // Draws (or updates) the lines

    const lineGen = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.count));

    svg.selectAll(".crime-line")
        .data(visibleCrimes, d => d[0])   // key = crime type
        .join(
            enter => enter.append("path")
                .attr("class", "crime-line")
                .attr("fill", "none")
                .attr("stroke-width", 2)
                .attr("stroke", ([type]) => color(type))
                
                .attr("d", ([type, values]) =>
                    lineGen(values.sort((a, b) => a.year - b.year))
                )
                .on('mouseover', function(event, d) {
                    const values = d[1].sort((a, b) => a.year - b.year);
                    const type = d[0];
                    const peak = values.reduce((acc, curr) => curr.count >= acc.count ? curr : acc);
                    const recent = values[values.length - 1];
                    const pctChange = (((recent.count - values[0].count) / values[0].count) * 100).toFixed(1);
                    const trend = recent.count >= values[0].count ? `↑ ${pctChange}%` : `↓ ${Math.abs(pctChange)}%`;
                
                    d3.select('#tooltip')
                        .style("display", 'block')
                        .html(`
                            <div style="font-family:sans-serif; min-width:160px; border-radius:4px">
                                <div style="background:${color(type)}; color:white; padding:6px 10px; font-size:17px; font-weight:bold;">
                                    ${type.charAt(0) + type.slice(1).toLowerCase()}
                                </div>
                                <div style="padding:8px 10px; font-size:15px;">
                                    Peak: <b>${peak.year}</b> (${peak.count.toLocaleString()})<br>
                                    Recent: <b>${recent.year}</b> (${recent.count.toLocaleString()})<br>
                                    Trend: <b style="color:${recent.count >= values[0].count ? '#e74c3c' : '#2ecc71'}">${trend}</b>
                                </div>
                            </div>
                        `)
                        .style("left", (event.pageX + 20) + "px")
                        .style("top", (event.pageY - 28) + "px");
                
                    d3.select(this).style('stroke-width', 3);
                })
                .on("mouseout", function (event, d) {
                    d3.select('#tooltip')
                    .style('display', 'none')
                    d3.select(this) 
                    .style('stroke-width', 2); 
                    
                })
                .on('click', function(event, d) {
                    const type = d[0];
                    
                    if (focused === type) {
                        focused = null;
                    } else {
                        focused = type;
                    }
                    updateAxes();
                    updateVis();
                })
                .attr("opacity", 0)
                .transition().duration(500)
                .attr("opacity", ([type]) => focused === null || focused === type ? 1 : 0)
                .attr("pointer-events", ([type]) => focused === null || focused === type ? "stroke" : "none")
                ,

            update => update
                .transition().duration(500)
                .attr("stroke", ([type]) => color(type))
                .attr("opacity", ([type]) => focused === null || focused === type ? 1 : 0)
                .attr("pointer-events", ([type]) => focused === null || focused === type ? "stroke" : "none")
                .attr("d", ([type, values]) =>
                    lineGen(values.sort((a, b) => a.year - b.year))
                ),

            exit => exit.transition().duration(500)
            .attr('opacity', 0).remove()
        );

}

function addLegend(){
    // Adds a legend so users can decode colors

    const types = Array.from(crimesByType.entries())
        .map(([type, values]) => ({
            type,
            total: d3.sum(values, d => d.count)
        }));
    types.sort((a, b) => d3.descending(a.total, b.total));
    const sortedTypes = types.map(d => d.type);
    const legendHeight = types.length * 20;
    const legendYOffset = (height - legendHeight) / 2;

    const palette = [
        ...d3.schemeTableau10,
        ...d3.schemePaired,
        ...d3.schemeDark2
    ];
    
    color.domain(sortedTypes).range(palette);

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 20}, ${legendYOffset})`);

    const row = legend.selectAll(".legend-row")
        .data(sortedTypes)
        .join("g")
        .attr("class", "legend-row")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`)
        .on("click", function(event, type) {
            if (hidden.has(type)) {
                hidden.delete(type);
            } else {
                hidden.add(type);
            }

            d3.select(this).select("rect")
                .attr("fill", hidden.has(type) ? "#ccc" : color(type));

            d3.select(this).select("text")
                .style("fill", hidden.has(type) ? "#999" : "#000");

            updateAxes(); 
            updateVis();
        });
    row.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", d => color(d));

    row.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .style("font-size", "12px")
        .text(d => d.charAt(0) + d.slice(1).toLowerCase());

}