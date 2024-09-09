async function display(element, pdb_file_path, sdf_file_path, confidence) {
        const container = document.getElementById(element);
    
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
        const confidenceDiv = document.createElement('div');
        confidenceDiv.style.marginTop = '10px'; // Space between button and confidence score
        confidenceDiv.innerText = `Confidence: ${confidence.toFixed(2)}`; // Format confidence to 2 decimal places
        rightContainer.appendChild(confidenceDiv);
    
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
                pdb_model.setStyle({}, { cartoon: { color: "spectrum", opacity: 0.8 } });
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
                sdf_model.setStyle({}, { stick: { color: "red", radius: 0.2, opacity: 0.8 } });
                viewer1.render();
            });
    
        // Fit all models into view
        viewer1.setStyle({}, { opacity: 1 }); // Ensure all models are visible
        viewer1.zoomTo(); // Zoom to fit all models into view
        result = sdf_file_path.split('_')
        console.log(result[2]);
        console.log("break");
        /* ListJson['Protein'].forEach(recPro => {
            console.log(recPro.name);
            if(recPro.name == result[2]){
                console.log("it works=======================================================================")
            }
            else{
                console.log("no match XXXXXXXXXXXXXXXXXXXXXXXX")
            }
        }); */
        // Variable to track whether the button has been pressed
        let buttonPressed = false;

        starButton.addEventListener('click', async function() {
            
            // Check if the button has already been pressed
            if (buttonPressed) return;
    
            // Set the buttonPressed flag to true to prevent further clicks
            buttonPressed = true;

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
            conresults.sort((a, b) => b.confidence - a.confidence);

            proteinNames = 

            pathDetail = 

            filteredProteins = "";

            buttonPressed = false;

            pdbresults = pdb_file_path;

            sdfresults = sdf_file_path

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
            

            /* // Create a new column to hold the text list of proteins with arrows
            const columnDiv = document.createElement('div');
            columnDiv.style.display = 'flex';
            columnDiv.style.flexDirection = 'column'; // Align items in a column
            columnDiv.style.alignItems = 'center'; // Center items horizontally
            columnDiv.style.marginBottom = '20px'; // Space between each set
    
            // Create a text element to show the confidence value
            const confidenceDiv = document.createElement('div');
            confidenceDiv.style.marginBottom = '10px';
            confidenceDiv.innerHTML = `Confidence: ${conresults[0].confidence !== undefined ? conresults[0].confidence : 'N/A'}`;
    
            // Append the confidence element to the column
            columnDiv.appendChild(confidenceDiv);
    
            // Create a div to show the detail relationships and protein descriptions
            const detailsDiv = document.createElement('div');
            detailsDiv.style.marginTop = '10px'; // Add some space above the details section
    
            // Add relationship details
            const relationshipDetailsDiv = document.createElement('div');
            relationshipDetailsDiv.style.marginTop = '10px';
            relationshipDetailsDiv.style.width = '300px'; // Fixed width
            relationshipDetailsDiv.style.height = '150px'; // Fixed height
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
    
            detailsDiv.appendChild(relationshipDetailsDiv);
            detailsDiv.appendChild(proteinDescriptionsDiv);
    
            // Append the detailsDiv to the columnDiv
            columnDiv.appendChild(detailsDiv);
    
            // Create the "Delete" button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.style.marginTop = '10px'; // Add some space above the button
    
            // Add event listener to delete the columnDiv and re-enable the button
            deleteButton.addEventListener('click', function() {
                container.removeChild(columnDiv);
                // Re-enable the star button
                starButton.disabled = false;
            });
    
            // Append the "Delete" button to the columnDiv
            columnDiv.appendChild(deleteButton);
    
            // Append the entire column to the container
            container.appendChild(columnDiv);
    
            // Disable the star button to prevent multiple additions
            starButton.disabled = true; */
            
        });
    }
    
    
    