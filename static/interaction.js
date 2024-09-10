class Section {
    constructor(state = {}) {
        this.state = state;
    }
    async render() {}
}

class ForwardRef extends Section {
    constructor() {
        super();
        this.ref = null;
    }
    async render() {
        if (!this.ref) return;
        this.ref.state = this.state;
        this.ref.render();
    }
}

class InteractionGraphSection extends Section {
    constructor(forwardRef) {
        super();

        this.forwardRef = forwardRef;

        const prefixRawGraph = 'static/Graphs_' + queryValue.toUpperCase() + '/Graphs/Raw_graph_without_query_' + queryValue.toUpperCase();
        this.graphs = [
            prefixRawGraph + '_d2_k20_f1.json',
            prefixRawGraph + '_d2_k20_f2.json',
            prefixRawGraph + '_d2_k20_f3.json',
            prefixRawGraph + '_d2_k20_f4.json',
            prefixRawGraph + '_d2_k20_f5.json'
        ];

        const prefixPaths = 'static/' + queryValue.toUpperCase() + '_Recommended_for_Development/' + queryValue.toUpperCase() + '_Development/' + queryValue.toUpperCase();
        this.paths = [
            prefixPaths + '_d2_k20_f1.json',
            prefixPaths + '_d2_k20_f2.json',
            prefixPaths + '_d2_k20_f3.json',
            prefixPaths + '_d2_k20_f4.json',
            prefixPaths + '_d2_k20_f5.json',
        ]

        this.buttonIds = ['button1', 'button2', 'button3', 'button4', 'button5'];

        this.state = {
            graphSelected: 0
        }

        this.cy = cytoscape({
            container: document.getElementById('cy'),
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': 'blue',
                        'label': 'data(label)',
                    },
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 3,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle',
                        //'label': 'data(label)',
                    },
                },
            ],
            layout: {
                name: 'preset',
            }
        });

        this.recommendJson = {};

        this.render();
    }
    async render() {
        const cy = this.cy;
    
        const arrangeNodesByDepth = () => {
            const centerNode = cy.getElementById(queryValue);
            centerNode.position({ x: 0, y: 0 });
    
            const depths = {};
            cy.nodes().forEach(node => {
                const depth = node.data('depth');
                if (!depths[depth]) {
                    depths[depth] = [];
                }
                depths[depth].push(node);
            });
    
            let currentRadius = 50;
    
            Object.keys(depths).sort((a, b) => a - b).forEach(depth => {
                const layerNodes = depths[depth];
                const angleStep = (2 * Math.PI) / layerNodes.length;
    
                layerNodes.forEach((node, index) => {
                    const angle = index * angleStep;
                    const x = currentRadius * Math.cos(angle);
                    const y = currentRadius * Math.sin(angle);
                    node.position({ x, y });
                });
    
                currentRadius += 150;
            });
    
            cy.layout({
                name: 'preset',
                fit: true,
                padding: 10,
            }).run();
        };
    
        const fetchAndUpdateGraph = async (fileIndex, active) => {
            // Fetch both jsonFiles[fileIndex] and jsonFiles2[fileIndex] concurrently
            await Promise.all([
                fetch(this.graphs[fileIndex]).then(response => response.json()),
                fetch(this.paths[fileIndex]).then(response => response.json())
            ])
            .then(([jsonData, jsonData2]) => {
                const file_index = fileIndex;
                const recommendJson = jsonData2; // Assign jsonFiles2 data to recommendJson
                const ListJson = jsonData;
        
                const nodes = Array.isArray(jsonData.Protein) ? jsonData.Protein.map(protein => ({
                    data: { id: protein.name, label: protein.name, annotation: protein.annotation, depth: protein.depth },
                    position: { x: 0, y: 0 }
                })) : [];
                
                const edges = Array.isArray(jsonData.Relationship) ? jsonData.Relationship.map(relationship => ({
                    data: {
                        id: `${relationship.start}-${relationship.end}`,
                        source: relationship.start,
                        target: relationship.end,
                        label: relationship.type,
                        score: relationship.properties.score,
                        path: 'default'
                    }
                })) : [];
        
                const connectedNodeIds = new Set();
                edges.forEach(edge => {
                    connectedNodeIds.add(edge.data.source);
                    connectedNodeIds.add(edge.data.target);
                });
        
                const filteredNodes = nodes.filter(node => connectedNodeIds.has(node.data.id));
        
                const pathColors = {};
                const uniquePaths = Array.from(new Set(edges.map(edge => edge.data.path)));
        
                cy.elements().remove(); // Clear existing elements
        
                cy.add([...filteredNodes, ...edges]);
                
                cy.style()
                    .selector('node')
                    .style({
                        'background-color': (node) => node.id() === queryValue.toUpperCase() ? 'red' : 'blue',
                        'label': 'data(label)',
                    })
                    .selector('edge')
                    .style({
                        'width': 3,
                        'line-color': (edge) => pathColors[edge.data('path')] || '#ccc',
                        'target-arrow-color': (edge) => pathColors[edge.data('path')] || '#ccc',
                        'target-arrow-shape': 'triangle',
                        //'label': 'data(label)',
                    })
                    .update();
        
                arrangeNodesByDepth();
                this.recommendJson = recommendJson;

                // Add hover functionality for displaying annotations
                let tooltip = null;
                cy.on('mouseover', 'node', function(evt) {
                    const node = evt.target;
                    const name = node.data('id');
                    const annotation = node.data('annotation');
                    if (tooltip) {
                        document.body.removeChild(tooltip);
                        tooltip = null;
                    }
                    tooltip = document.createElement('div');
                    tooltip.id = 'cy-tooltip';
                    tooltip.innerHTML = `<strong>${name}</strong>: ${annotation}`;
                    tooltip.style.position = 'absolute';
                    tooltip.style.backgroundColor = 'white';
                    tooltip.style.maxWidth = '250px';
                    tooltip.style.border = '1px solid #ccc';
                    tooltip.style.padding = '5px';
                    tooltip.style.borderRadius = '3px';
                    tooltip.style.boxShadow = '0px 0px 5px rgba(0,0,0,0.3)';
                    tooltip.style.pointerEvents = 'none';
                    document.body.appendChild(tooltip);

                    cy.on('mousemove', function(e) {
                        if (tooltip) {
                            const cyContainer = cy.container();
                            const rect = cyContainer.getBoundingClientRect();
                            tooltip.style.left = (e.originalEvent.clientX + 10) + 'px';
                            tooltip.style.top = (e.originalEvent.clientY + 10) + 'px';
                        }
                    });
                });

                cy.on('mouseout', 'node', function() {
                    if (tooltip) {
                        document.body.removeChild(tooltip);
                        tooltip = null;
                    }
                });
                if(active){
                    this.Display();
                }
            })
            .catch(error => {
                console.error('Error fetching JSON data:', error);
            });
        };

        this.buttonIds.forEach((buttonId, index) => {
            document.getElementById(buttonId).onclick = () => {
                this.state.graphSelected = index;
                this.render();
            }
        });
        const setActiveButton = (activeId) => {
            this.buttonIds.forEach(buttonId => {
                const button = document.getElementById(buttonId);
                if (buttonId === activeId) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });
        };
        document.getElementById('resetButton').onclick = () => {
            cy.elements().remove(); // Clear existing elements
            this.render();
        }
        document.getElementById('DisplayOnGraph2').onclick = () => {
            this.Display();
            this.render();
        }
        // Default to Graph 1 on page load
        fetchAndUpdateGraph(this.state.graphSelected,this.activated);
        setActiveButton(this.buttonIds[this.state.graphSelected]);

        this.forwardRef.state = []; // TODO
        //this.forwardRef.render();
    }
    async Display() {
        let pdbFilePaths = [];
        let sdfFilePaths = [];
        let sdftoptenPaths = [];
    
        if (queryValue.toUpperCase() == "MARK4") {
            // Fetch PDB file paths
            await fetch('/get_protein_files')
                .then(response => response.json())
                .then(data => {
                    pdbFilePaths = data;
                });
    
            // Fetch SDF file paths
            await fetch('/get_sdf_files')
                .then(response => response.json())
                .then(data => {
                    sdfFilePaths = data;
                });
        }
        if (queryValue.toUpperCase() == "MAPT") {
            // Fetch PDB file paths
            await fetch('/get_protein_files2')
                .then(response => response.json())
                .then(data => {
                    pdbFilePaths = data;
                });
    
            // Fetch SDF file paths
            await fetch('/get_sdf_files2')
                .then(response => response.json())
                .then(data => {
                    sdfFilePaths = data;
                });
        }
    
        for (let i = 0; i < sdfFilePaths.length; i++) {
            let json_file_path = sdfFilePaths[i];
            let proteinLocation = json_file_path.split("_");
            let proteinName = proteinLocation[2];
    
            await fetch(json_file_path)
                .then(response => response.json())
                .then(jsonData => {
                    if (jsonData.detail == "Inference error") {
                        sdftoptenPaths.push({
                            name: proteinName,
                            confidence: undefined
                        });
                    } else {
                        let thirdItem = jsonData.position_confidence[0];  // Get the third item (index 2)
                        sdftoptenPaths.push({
                            name: proteinName,
                            confidence: thirdItem
                        });
                    }
                });
        }
        
        sdftoptenPaths = sdftoptenPaths.filter(item => item.confidence !== undefined);
        sdftoptenPaths.sort((a, b) => a.confidence - b.confidence); // Sort in descending order
    
        // Get top 10 nodes based on confidence
        const topNodes = sdftoptenPaths.slice(0, 10).map(item => item.name); 
    
        // Remove the 'highlighted' class from any previously highlighted nodes
        this.cy.nodes('.highlighted').removeClass('highlighted');

        // Highlight only the top 10 nodes
        this.cy.nodes().filter(node => topNodes.includes(node.id()) && node.id() !== queryValue.toUpperCase())
            .addClass('highlighted');

        // Apply styles directly to the highlighted nodes without affecting the global style
        this.cy.batch(() => {
            this.cy.nodes('.highlighted').forEach(node => {
                node.style({
                    'background-color': 'yellow',
                    'border-color': 'red',
                    'border-width': '2px'
                });
            });
        });
    }
}

class ImpactSearchSection extends Section {
    constructor(pathwayRankingSection, interactionGraphSection) {
        super();

        this.pathwayRankingSection = pathwayRankingSection;
        this.interactionGraphSection = interactionGraphSection;

        this.render();
    }
    
    async render() {
        const display = () => {
            const cy = this.interactionGraphSection.cy;
            const recommendJson = this.interactionGraphSection.recommendJson;    

            let searchTerm = document.querySelector('.search-input').value.toLowerCase(); // Convert to lowercase for case-insensitive search
            if (!searchTerm) return;
            // Clear previous Cytoscape instances
            const container = document.querySelector('.bottom-container2');
            container.querySelectorAll('.cy-container-wrapper').forEach(el => el.remove());
        
            // Clear any previous highlights in the main Cytoscape instance
            cy.elements().removeClass('highlighted');
    
            let foundPaths = false;  // Flag to track if any matching path is found
            
            if (recommendJson['Path Details']) {
                recommendJson['Path Details'].forEach(pathDetail => {
                    const explanation = pathDetail.explanation || ''; // Assuming 'explanation' is part of pathDetail
                    const details = pathDetail.details || ''; // Assuming 'details' is part of pathDetail
                    console.log(pathDetail.path[pathDetail.path.length - 1])
                    // Check if the explanation or details include the search term
                    if ((explanation.toLowerCase().includes(searchTerm) || details.toLowerCase().includes(searchTerm)) &&
                        (details.toLowerCase().includes("the interaction is **relevant**") || details.toLowerCase().includes("the interaction is relevant"))) {
                        if(explanation.toLowerCase().includes("do not have a direct phosphorylation interaction")){
                            return;
                        }    
                        foundPaths = true;
                        // Highlight the found path in the main Cytoscape instance (cy)
                        const pathIds = pathDetail.relationships ? new Set(pathDetail.relationships.flatMap(rel => [rel.start, rel.end])) : new Set();
        
                        // Update the color of nodes and edges in the main cy instance based on the path found
                        cy.nodes().forEach(node => {
                            if (node.data('id') !== queryValue.toUpperCase() && pathIds.has(node.data('id'))) {
                                var nodeColor = node.style('background-color');
                                var yellowColor = 'rgb(255, 255, 0)';
                                if(nodeColor === yellowColor){
                                    node.style('background-color', 'yellow');
                                }
                                else{
                                    node.style('background-color', 'dark blue');
                                    node.style('border-color', 'red');
                                }
                            }
                        });
    
                        cy.edges().forEach(edge => {
                            if (pathIds.has(edge.data('source')) && pathIds.has(edge.data('target'))) {
                                edge.style('line-color', 'red');
                                edge.style('target-arrow-color', 'red');
                            }
                        });
        
                        // Continue with creating the Cytoscape instances as before
                        let wrapperDiv = document.createElement('div');
                        wrapperDiv.classList.add('cy-container-wrapper');
                        wrapperDiv.style.display = 'flex';
                        wrapperDiv.style.marginBottom = '10px';
                        container.appendChild(wrapperDiv);
        
                        let button = document.createElement('button');
                        button.classList.add('cy-button');
                        button.innerHTML = '⭐';
                        wrapperDiv.appendChild(button);
        
                        let newCyContainer = document.createElement('div');
                        newCyContainer.classList.add('cy-container');
                        newCyContainer.style.width = '200px';
                        newCyContainer.style.height = '200px';
                        wrapperDiv.appendChild(newCyContainer);
        
                        let descriptionDiv = document.createElement('div');
                        descriptionDiv.classList.add('node-description');
                        descriptionDiv.style.width = '100%';
                        descriptionDiv.style.height = '200px';
                        descriptionDiv.innerText = explanation || details || 'No explanation or details available';
                        wrapperDiv.appendChild(descriptionDiv);
        
                        const elements = [];
                        const filteredProteins = (recommendJson['Recommended Proteins'] || []).filter(protein => pathIds.has(protein.name));
        
                        filteredProteins.forEach(protein => {
                            elements.push({
                                data: {
                                    id: protein.name,
                                    label: protein.name,
                                    annotation: protein.annotation,
                                    depth: protein.depth
                                }
                            });
                        });
        
                        const relationships = pathDetail.relationships || [];
                        relationships.forEach(rel => {
                            elements.push({
                                data: {
                                    id: `${rel.start}-${rel.end}`,
                                    source: rel.start,
                                    target: rel.end,
                                    label: rel.type
                                }
                            });
                        });
        
                        let cySmall = cytoscape({
                            container: newCyContainer,
                            elements: elements,
                            style: [
                                {
                                    selector: 'node',
                                    style: {
                                        'background-color': (node) => node.id() === queryValue.toUpperCase() ? 'red' : 'blue',
                                        'label': 'data(label)'
                                    }
                                },
                                {
                                    selector: 'edge',
                                    style: {
                                        'width': 2,
                                        'line-color': '#ddd'
                                    }
                                }
                            ],
                            layout: {
                                name: 'grid',
                                rows: 1
                            }
                        });
    
                        button.onclick = async () => {
                            if (button.classList.contains("cy-button-marked")) {
                                // If button is already marked, disable it
                                button.disabled = true;
                                return;
                            }
                        
                            // Mark the button as clicked
                            button.classList.add("cy-button-marked");
                            button.disabled = true; // Disable the button after marking
                        
                            const impactVal = await getSliderModal();
                            if (impactVal === null) {
                                // Re-enable the button if no impact value is provided
                                button.disabled = false;
                                return;
                            }

                            // Get node IDs from the cySmall instance
                            const proteinNames = cySmall.nodes().map(node => node.id());
                            
                            // Fetch PDB and SDF file paths
                            let pdbFilePaths = [];
                            let sdfFilePaths = [];
                            let confidenceValue = [];
                            if(queryValue.toUpperCase() == "MARK4"){
                                // Fetch PDB file paths
                                await fetch('/get_protein_files')
                                    .then(response => response.json())
                                    .then(data => {
                                        pdbFilePaths = data;
                                    });
                            
                                // Fetch SDF file paths
                                await fetch('/get_sdf_files')
                                    .then(response => response.json())
                                    .then(data => {
                                        sdfFilePaths = data;
                                    });
                            }
                            if(queryValue.toUpperCase() == "MAPT"){
                                // Fetch PDB file paths
                                await fetch('/get_protein_files2')
                                    .then(response => response.json())
                                    .then(data => {
                                        pdbFilePaths = data;
                                    });
                            
                                // Fetch SDF file paths
                                await fetch('/get_sdf_files2')
                                    .then(response => response.json())
                                    .then(data => {
                                        sdfFilePaths = data;
                                    });
                            }
                            
                            for (let i = 0; i < sdfFilePaths.length; i++) {
                                let json_file_path = sdfFilePaths[i];
                            
                                await fetch(json_file_path)
                                    .then(response => response.json())
                                    .then(jsonData => {
                                        if (jsonData.detail == "Inference error") {
                                            confidenceValue.push({
                                                filePath: json_file_path,
                                                confidence: undefined
                                            });
                                        } else {
                                            let thirdItem = jsonData.position_confidence[0];  // Get the third item (index 2)
                                            confidenceValue.push({
                                                filePath: json_file_path,
                                                confidence: thirdItem
                                            });
                                        }
                                });
                            }
                            
                            const pdbresults = pdbFilePaths.filter(element => element.includes(pathDetail.path[pathDetail.path.length - 1]+ '_'));
                            const sdfresults = sdfFilePaths.filter(element => element.includes(pathDetail.path[pathDetail.path.length - 1]+ '_'));
                            const conresults = confidenceValue.filter(element => element.filePath.includes(pathDetail.path[pathDetail.path.length - 1]+ '_'));

                            this.pathwayRankingSection.state.pathways.push({
                                proteinNames,
                                conresults,
                                pathDetail,
                                filteredProteins,
                                pdbresults, 
                                sdfresults,
                                impactVal 
                            });
                            this.pathwayRankingSection.render();
                        }   
                    }
                });
        
                if (!foundPaths) {
                    console.log("No matching paths found for the search term.");
                } else {
                    // Optionally: Zoom to the matching path in the main cy instance
                    const matchingNodes = cy.nodes().filter(node => node.style('background-color') === 'darkblue');
                    if (matchingNodes.length > 0) {
                        cy.fit(matchingNodes, 50); // Zoom to the matching nodes with some padding
                    }
                }
            }
        }

        display();

        document.querySelector('.search-button').onclick = () => {
            this.render();
        };

        this.pathwayRankingSection.render();
    }
}

class DockingSimulatorSection extends Section {
    constructor(pathwayRankingSection) {
        super();

        this.pathwayRankingSection = pathwayRankingSection;

        document.querySelector('.search-button2').onclick = () => this.render();
    }

    async render() {
        let pdbFilePaths = [];
        let sdfFilePaths = [];
        let sdftoptenPaths = [];
        
        if(queryValue.toUpperCase() == "MARK4"){
            // Fetch PDB file paths
            await fetch('/get_protein_files')
                .then(response => response.json())
                .then(data => {
                    pdbFilePaths = data;
                });
        
            // Fetch SDF file paths
            await fetch('/get_sdf_files')
                .then(response => response.json())
                .then(data => {
                    sdfFilePaths = data;
                });
        }
        if(queryValue.toUpperCase() == "MAPT"){
            // Fetch PDB file paths
            await fetch('/get_protein_files2')
                .then(response => response.json())
                .then(data => {
                    pdbFilePaths = data;
                });
        
            // Fetch SDF file paths
            await fetch('/get_sdf_files2')
                .then(response => response.json())
                .then(data => {
                    sdfFilePaths = data;
                });
        }
    
        for (let i = 0; i < sdfFilePaths.length; i++) {
            let json_file_path = sdfFilePaths[i];
            let pdb_path = pdbFilePaths[i];
    
            await fetch(json_file_path)
                .then(response => response.json())
                .then(jsonData => {
                    if (jsonData.detail == "Inference error") {
                        sdftoptenPaths.push({
                            filePath: json_file_path,
                            filePath2: pdb_path,
                            confidence: undefined
                        });
                    } else {
                        let thirdItem = jsonData.position_confidence[0];  // Get the third item (index 2)
                        sdftoptenPaths.push({
                            filePath: json_file_path,
                            filePath2: pdb_path,
                            confidence: thirdItem
                        });
                    }
                });
        }
        sdftoptenPaths = sdftoptenPaths.filter(item => item.confidence !== undefined);
        sdftoptenPaths.sort((a, b) => a.confidence - b.confidence);
        
        const viewerDivs = document.querySelectorAll('[id^="viewerdiv"]');

        for (let i = 0; i <= 9; i++) {
            if (sdftoptenPaths[i]) {
                this.display(`viewerdiv${i}`, sdftoptenPaths[i].filePath2, sdftoptenPaths[i].filePath, sdftoptenPaths[i].confidence);
            }
        }
        
        document.querySelector('.search-button2').onclick = () => this.render();

        this.pathwayRankingSection.render();
    }
    async display(element, pdb_file_path, sdf_file_path, confidence) {
        const container = document.getElementById(element);
        
        const result = sdf_file_path.split('_');

        // Clear existing content in the container
        container.innerHTML = '';
    
        // Create a container for the button and the viewer
        const contentContainer = document.createElement('div');
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'row'; // Arrange items in a row
        contentContainer.style.alignItems = 'center';
        contentContainer.style.marginBottom = '10px';
        contentContainer.style.position = 'relative'; // Ensure proper positioning
    
        // Create the viewer container
        const viewerContainer = document.createElement('div');
        viewerContainer.style.width = '200px';
        viewerContainer.style.height = '200px';
        contentContainer.appendChild(viewerContainer);
    
        // Create a container for the ⭐ button and confidence score
        const rightContainer = document.createElement('div');
        rightContainer.style.display = 'flex';
        rightContainer.style.flexDirection = 'column'; // Stack items vertically
        rightContainer.style.marginLeft = '10px'; // Space between viewer and button
        rightContainer.style.justifyContent = 'center'; // Center content vertically
    
        // Create the ⭐ button
        const starButton = document.createElement('button');
        starButton.classList.add('cy-button');
        starButton.innerHTML = '⭐';
        rightContainer.appendChild(starButton);
        
        // Create the confidence score element
        const nameDiv = document.createElement('div');
        nameDiv.style.marginTop = '10px'; // Space between button and confidence score
        nameDiv.innerText = `Protein Name: ${result[2]}`; // Format confidence to 2 decimal places
        rightContainer.appendChild(nameDiv);

        // Create the confidence score element
        const confidenceDiv = document.createElement('div');
        confidenceDiv.style.marginTop = '10px'; // Space between button and confidence score
        confidenceDiv.innerText = `Confidence: ${confidence.toFixed(2)}`; // Format confidence to 2 decimal places
        rightContainer.appendChild(confidenceDiv);

        const prefixRawGraph = 'static/Graphs_' + queryValue.toUpperCase() + '/Graphs/Raw_graph_without_query_' + queryValue.toUpperCase();
        const paths = [
            prefixRawGraph + '_d2_k20_f1.json',
            prefixRawGraph + '_d2_k20_f2.json',
            prefixRawGraph + '_d2_k20_f3.json',
            prefixRawGraph + '_d2_k20_f4.json',
            prefixRawGraph + '_d2_k20_f5.json'
        ];

        let versionList = [];

        let insideVersionJson;

        for (let i = 0; i < paths.length; i++) {
            await fetch(paths[i])
                .then(response => response.json())
                .then(jsonData => {
                    console.log(jsonData['Protein']);
                    insideVersionJson = jsonData['Protein'];
                });
            for(let j = 0; j < insideVersionJson.length; j++){
                if(insideVersionJson[j].name === result[2]){
                    versionList.push(i+1);
                }
                else{
                    console.log("can not find");
                }
            }
        }

        // Create the confidence score element
        const VersionDiv = document.createElement('div');
        VersionDiv.style.marginTop = '10px'; // Space between button and confidence score
        // Convert versionList to a comma-separated string
        const versionText = versionList.join(', ');

        // Set the innerText to display the version numbers
        VersionDiv.innerText = `Graph: ${versionText}`;
        rightContainer.appendChild(VersionDiv);
        
        contentContainer.appendChild(rightContainer);
        container.appendChild(contentContainer);
    
        // Initialize the 3D viewer
        const viewer1 = $3Dmol.createViewer(viewerContainer, { backgroundColor: "white" });
    
        // Fetch and add the PDB model
        await fetch(pdb_file_path)
            .then(response => response.text())
            .then(pdbData => {
                viewer1.addModel(pdbData, "pdb");
                var pdb_model = viewer1.getModel(0);
                pdb_model.setStyle({}, { cartoon: { color: "spectrum", opacity: 0.75 } });
                viewer1.render();
            });
    
        // Fetch and add the SDF model
        await fetch(sdf_file_path)
            .then(response => response.json())
            .then(txtData => {
                const ligand_positions = txtData.ligand_positions[0];
                const ligand_positions_3d = ligand_positions.replace(/2D/g, '3D');
                viewer1.addModel(ligand_positions_3d, "sdf");
                const sdf_model = viewer1.getModel(1);
                sdf_model.setStyle({}, { stick: { color: "black", radius: 0.2, opacity: 0.9 } });
                viewer1.render();
            });
    
        // Fit all models into view
        viewer1.setStyle({}, { opacity: 1 }); // Ensure all models are visible
        // viewer1.zoomTo(); // Zoom to fit all models into view

        starButton.onclick = async () => {
            const impactVal = await getSliderModal();
            if (impactVal === null) {
                buttonPressed = false;
                return;
            }

            let pdbFilePaths = [];
            let sdfFilePaths = [];
            let confidenceValue = [];
            
            await fetch('/get_protein_files')
                .then(response => response.json())
                .then(data => {
                    pdbFilePaths = data;
                });
    
            await fetch('/get_sdf_files')
                .then(response => response.json())
                .then(data => {
                    sdfFilePaths = data;
                });
    
            for (let i = 0; i < sdfFilePaths.length; i++) {
                let json_file_path = sdfFilePaths[i];
            
                await fetch(json_file_path)
                    .then(response => response.json())
                    .then(jsonData => {
                        if (jsonData.detail === "Inference error") {
                            confidenceValue.push({
                                filePath: json_file_path,
                                confidence: undefined
                            });
                        } else {
                            let thirdItem = jsonData.position_confidence[0];  // Get the third item (index 2)
                            confidenceValue.push({
                                filePath: json_file_path,
                                confidence: thirdItem
                            });
                        }
                });
            }
            
            const conresults = confidenceValue.filter(element => element.confidence !== undefined);
            conresults.sort((a, b) => a.confidence - b.confidence);

            const prefixPaths = 'static/' + queryValue.toUpperCase() + '_Recommended_for_Development/' + queryValue.toUpperCase() + '_Development/' + queryValue.toUpperCase();
            const paths = [
                prefixPaths + '_d2_k20_f1.json',
                prefixPaths + '_d2_k20_f2.json',
                prefixPaths + '_d2_k20_f3.json',
                prefixPaths + '_d2_k20_f4.json',
                prefixPaths + '_d2_k20_f5.json'
            ]
            const mergedJson = {
                'Recommended Proteins': [],
                'Relationships': [],
                'Path Details': []
            }
            for (let i = 0; i < paths.length; i++) {
                await fetch(paths[i])
                    .then(response => response.json())
                    .then(jsonData => {
                        mergedJson['Recommended Proteins'].push(...jsonData['Recommended Proteins']);
                        mergedJson['Relationships'].push(...jsonData['Relationships']);
                        mergedJson['Path Details'].push(...jsonData['Path Details']);
                        console.log(mergedJson);
                    });
            }
            let proteinNames = [];
            const searchTerm = result[2];

            const recommendedProteins = mergedJson['Recommended Proteins'];
            const pathDetails = mergedJson['Path Details'];


            const pathDetail = pathDetails.find(pathDetail => pathDetail.path.includes(searchTerm));
            if (!pathDetail) {
                console.log('Path not found');
                return;
            }

            let filteredProteins = [];

            const namesOffilteredProteins = pathDetail['path'];

            for (let i = 0; i < namesOffilteredProteins.length; i++) {
                const protein = recommendedProteins.find(protein => protein.name === namesOffilteredProteins[i]);
                filteredProteins.push(protein);
            }

            proteinNames = pathDetail.path;

            const pdbresults = pdb_file_path;

            const sdfresults = sdf_file_path;

            this.pathwayRankingSection.state.pathways.push({
                proteinNames,
                conresults,
                pathDetail,
                filteredProteins,
                pdbresults, 
                sdfresults,
                impactVal 
            });
            this.pathwayRankingSection.render();
            
        };
        
    }
}

class PPIComparisonSection extends Section {
    constructor(pathwayRankingSection) {
        super();

        this.pathwayRankingSection = pathwayRankingSection;
        
        this.render();
    }

    async render() {
        const apply = () => {
            let container = document.querySelector('#canvas-container'); // Access by id
            
            console.log(container.innerHTML);

            // Retrieve percentages from the triangle canvas
            const getTrianglePercentages = () => {
                const functionPercentage = parseFloat(document.querySelector('#vertex1').textContent.replace('Impact: ', '').replace('%', ''));
                const dockingPercentage = parseFloat(document.querySelector('#vertex2').textContent.replace('Docking Score: ', '').replace('%', ''));
                const ppiPercentage = parseFloat(document.querySelector('#vertex3').textContent.replace('Length: ', '').replace('%', ''));
                console.log(functionPercentage);
                return [functionPercentage, dockingPercentage, ppiPercentage];
            };

            // Calculate sorting values for each column
            const trianglePercentages = getTrianglePercentages();

            this.pathwayRankingSection.state.trianglePercentages = trianglePercentages;
            this.pathwayRankingSection.render();
        }

        document.querySelector('.apply').onclick = () => apply();
        
        document.querySelector('.reset').onclick = () => {
            triangleCanvas = new TriangleCanvas('canvas-container');
        };

        // this.pathwayRankingSection.state = []; // TODO
        // this.pathwayRankingSection.render();
    }
}

class PathwayRankingSection extends Section {
    constructor(downloadSection) {
        super({
            trianglePercentages: [3, 3, 3],
            pathways: []
        });

        this.downloadSection = downloadSection;

        this.render();
    }
    async display(element, pdb_file_path, sdf_file_path) {
        // Initialize the 3D viewer
        const viewer1 = $3Dmol.createViewer(element, { backgroundColor: "white" });
    
        // Fetch and add the PDB model
        await fetch(pdb_file_path)
            .then(response => response.text())
            .then(pdbData => {
                viewer1.addModel(pdbData, "pdb");
                var pdb_model = viewer1.getModel(0);
                pdb_model.setStyle({}, { cartoon: { color: "spectrum", opacity: 0.75 } });
                viewer1.render();
            });
    
        // Fetch and add the SDF model
        await fetch(sdf_file_path)
            .then(response => response.json())
            .then(txtData => {
                const ligand_positions = txtData.ligand_positions[0];
                const ligand_positions_3d = ligand_positions.replace(/2D/g, '3D');
                viewer1.addModel(ligand_positions_3d, "sdf");
                const sdf_model = viewer1.getModel(1);
                sdf_model.setStyle({}, { stick: { color: "black", radius: 0.2, opacity: 0.9 } });
                viewer1.render();
            });
    
        // Fit all models into view
        viewer1.setStyle({}, { opacity: 1 }); // Ensure all models are visible
        // viewer1.zoomTo(); // Zoom to fit all models into view
    }
    async render() {
        // Find the target container where everything should be appended
        const targetContainer = document.querySelector('.inner-inner-box3');
    
        targetContainer.innerHTML = '';
    
        // Create a Set to track unique pathways
        const seenPathways = new Set();
    
        const renderPathway = ({ proteinNames, conresults, pathDetail, filteredProteins, pdbresults, sdfresults, impactVal }, idx) => {
            // Join protein names with arrows (e.g., '→')
            const proteinsList = proteinNames.join(' → ');
            const uniquePathwayIdentifier = proteinsList;
    
            // Skip rendering if this pathway has already been seen
            if (seenPathways.has(uniquePathwayIdentifier)) {
                return;
            }
    
            // Add this pathway to the Set
            seenPathways.add(uniquePathwayIdentifier);
    
            // Create a new column to hold the text list of proteins with arrows
            const columnDiv = document.createElement('div');
            columnDiv.style.display = 'flex';
            columnDiv.style.flexDirection = 'column'; // Align items in a column
            columnDiv.style.alignItems = 'center'; // Center items horizontally
            columnDiv.style.marginBottom = '20px'; // Space between each set
    
            // Create a text element to show the list of proteins with arrows
            const proteinsListDiv = document.createElement('div');
            proteinsListDiv.style.marginBottom = '10px';
            proteinsListDiv.innerHTML = `Proteins in path: ${proteinsList}`;
    
            // Append the text element to the column
            columnDiv.appendChild(proteinsListDiv);
    
            // Create a text element to show the confidence value
            const confidenceDiv = document.createElement('div');
            confidenceDiv.style.marginBottom = '10px';
            confidenceDiv.innerHTML = `Confidence: ${conresults[0].confidence !== undefined ? conresults[0].confidence : 'N/A'}`;
    
            // Append the confidence element below the proteins list
            columnDiv.appendChild(confidenceDiv);
    
            // Create a div to show the detail relationships and protein descriptions
            const detailsDiv = document.createElement('div');
            detailsDiv.style.marginTop = '10px'; // Add some space above the details section
    
            // Center all items inside detailsDiv using Flexbox
            detailsDiv.style.display = 'flex';
            detailsDiv.style.flexDirection = 'column'; // Arrange items in a column
            detailsDiv.style.alignItems = 'center'; // Center items horizontally
            detailsDiv.style.justifyContent = 'center'; // Center items vertically (if needed)
            detailsDiv.style.textAlign = 'center'; // Ensure text is also centered
    
            // Create the viewer container
            const viewerContainer = document.createElement('div'); // Changed from 'canvas' to 'div'
            viewerContainer.style.width = '200px';
            viewerContainer.style.height = '200px';
            viewerContainer.style.border = '1px solid #ccc';
            viewerContainer.style.padding = '10px'; 
            viewerContainer.style.position = 'relative'; // Ensure relative positioning for proper alignment
            viewerContainer.style.overflow = 'hidden';  // Prevent overflow issues
    
            // Pass viewerContainer directly to the display function
            this.display(viewerContainer, pdbresults, sdfresults);
    
            detailsDiv.appendChild(viewerContainer);
    
            // Add protein descriptions with bold names and fixed size
            const explanationDiv = document.createElement('div');
            explanationDiv.style.marginTop = '10px';
            explanationDiv.style.width = '300px'; // Fixed width
            explanationDiv.style.height = '150px'; // Fixed height
            explanationDiv.style.overflowY = 'auto'; // Scrollable if content overflows
            explanationDiv.style.border = '1px solid #ccc'; // Optional: border for better visibility
            explanationDiv.style.padding = '10px'; // Optional: padding for spacing
    
            const explanationHtml = pathDetail['explanation'];
    
            explanationDiv.innerHTML = `<strong>Path Explanation:</strong><br>${explanationHtml}`;
    
            detailsDiv.appendChild(explanationDiv);
    
            // Add relationship details
            const relationshipDetailsDiv = document.createElement('div');
            relationshipDetailsDiv.style.marginTop = '10px';
            relationshipDetailsDiv.style.width = '300px'; // Fixed width
            relationshipDetailsDiv.style.height = '50px'; // Fixed height
            relationshipDetailsDiv.style.overflowY = 'auto'; // Scrollable if content overflows
            relationshipDetailsDiv.style.border = '1px solid #ccc'; // Optional: border for better visibility
            relationshipDetailsDiv.style.padding = '10px'; // Optional: padding for spacing
    
            const relationshipHtml = pathDetail.relationships.map(rel => 
                `From ${rel.start} to ${rel.end} (${rel.type})`
            ).join('<br>');
    
            relationshipDetailsDiv.innerHTML = `<strong>Relationships:</strong><br>${relationshipHtml}`;
    
            detailsDiv.appendChild(relationshipDetailsDiv);
    
            // Add protein descriptions with bold names and fixed size
            const proteinDescriptionsDiv = document.createElement('div');
            proteinDescriptionsDiv.style.marginTop = '10px';
            proteinDescriptionsDiv.style.width = '300px'; // Fixed width
            proteinDescriptionsDiv.style.height = '200px'; // Fixed height
            proteinDescriptionsDiv.style.overflowY = 'auto'; // Scrollable if content overflows
            proteinDescriptionsDiv.style.border = '1px solid #ccc'; // Optional: border for better visibility
            proteinDescriptionsDiv.style.padding = '10px'; // Optional: padding for spacing
    
            const descriptionsHtml = filteredProteins.map(protein => 
                `<div><strong>${protein.name}:</strong> ${protein.annotation || 'No description available'}</div>`
            ).join('');
    
            proteinDescriptionsDiv.innerHTML = `<strong>Protein Descriptions:</strong><br>${descriptionsHtml}`;
    
            detailsDiv.appendChild(proteinDescriptionsDiv);
    
            // Append the detailsDiv to the columnDiv
            columnDiv.appendChild(detailsDiv);
    
            // Create the "Delete" button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.style.marginTop = '10px'; // Add some space above the button
    
            // Add event listener to delete the columnDiv and re-enable the button
            deleteButton.onclick = () => {
                this.state.pathways.splice(idx, 1);
                this.render();
            }
    
            // Append the "Delete" button to the columnDiv
            columnDiv.appendChild(deleteButton);
    
            // Append the entire column to the target container
            targetContainer.appendChild(columnDiv);
        }
    
        const pathways = this.state.pathways;
    
        const scoreOfPathway = ({ proteinNames, conresults, pathDetail, filteredProteins, pdbresults, sdfresults, impactVal}) => {
            const impact = this.state.trianglePercentages[0];
            const docking = this.state.trianglePercentages[1]; 
            const length = this.state.trianglePercentages[2];
    
            const impactScore = impact * impactVal;
            const dockingScore = -1 * docking * conresults[0].confidence;
            const lengthScore = -1 * length * proteinNames.length;
    
            return impactScore + dockingScore + lengthScore;
        }
    
        const sortedPathways = pathways.sort((pathwayA, pathwayB) => {
            const scoreOfA = scoreOfPathway(pathwayA);
            const scoreOfB = scoreOfPathway(pathwayB);
            return scoreOfB - scoreOfA;
        });
    
        // Filter out duplicates
        const uniquePathways = [];
        const seenPathwaysForUnique = new Set();
    
        sortedPathways.forEach(pathway => {
            const uniquePathwayIdentifier = pathway.proteinNames.join(' → ');
            if (!seenPathwaysForUnique.has(uniquePathwayIdentifier)) {
                seenPathwaysForUnique.add(uniquePathwayIdentifier);
                uniquePathways.push(pathway);
            }
        });
    
        this.state.pathways = uniquePathways;
    
        uniquePathways.forEach(pathway => {
            renderPathway(pathway);
        });
    
        this.downloadSection.state = this.state;
    }    
}
class DownloadSection extends Section {
    constructor() {
        super({
            trianglePercentages: [3, 3, 3],
            pathways: []
        });
        this.render();
    }
    async render() {
        function downloadString(text, fileType, fileName) {
            var blob = new Blob([text], { type: fileType });
            
            var a = document.createElement('a');
            a.download = fileName;
            a.href = URL.createObjectURL(blob);
            a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
        }

        document.getElementById('download-csv').onclick = () => {
            const csv = this.state.pathways.map(({ proteinNames, conresults, pathDetail, filteredProteins, pdbresults, sdfresults, impactVal, }) => {
                // TODO: Return comma separated string
                return `${proteinNames[proteinNames.length - 1]}, ${proteinNames.join(' -> ')}, ${conresults[0].confidence}, ${pathDetail}, ${filteredProteins}, ${pdbresults}, ${sdfresults}, ${impactVal}`
            }).join('\n');
            downloadString(csv, 'text/csv', 'download.csv');
        };
    }
}

// const pathwayRankingSection = new PathwayRankingSection();

// let recommendJson

// let file_index

// let impactVal

const getSliderModal = () => {
    return new Promise((resolve) => {
        // Get modal elements
        const modal = document.getElementById("functionScoreModal");
        const closeModal = document.getElementsByClassName("close")[0];
        const submitButton = document.getElementById("submitScore");
        const slider = document.getElementById("functionScoreSlider");
        const sliderValueDisplay = document.getElementById("sliderValue");

        modal.style.display = "block";

        // Close modal on close button click
        closeModal.onclick = function() {
            modal.style.display = "none";
            resolve(null);
        }

        // Close modal on outside click
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }

        // Update slider value display as the slider moves
        slider.oninput = function() {
            sliderValueDisplay.textContent = this.value;
        }

        // Submit button logic
        submitButton.onclick = () => {
            const functionScore = slider.value;
            modal.style.display = "none";
            resolve(functionScore);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const downloadSection = new DownloadSection();
    const pathwayRankingSection = new PathwayRankingSection(downloadSection);
    const forwardRef = new ForwardRef();
    const interactionGraphSection = new InteractionGraphSection(forwardRef);
    const impactSearchSection = new ImpactSearchSection(pathwayRankingSection, interactionGraphSection);
    const dockingSimulatorSection = new DockingSimulatorSection(pathwayRankingSection);
    const ppiComparisonSection = new PPIComparisonSection(pathwayRankingSection);
    forwardRef.ref = impactSearchSection;
    
});