class TriangleCanvas {
    constructor(containerId) {
        this.containerId = containerId;
        this.dot;
        this.triangleVertices;
        this.isDragging = false;

        this.setup();
    }

    setup() {
        this.canvas = createCanvas(400, 400);
        this.canvas.parent(this.containerId);
        const size = 300; // Size of the triangle
        this.triangleVertices = this.calculateEquilateralTriangleVertices(200, 200, size); // Center at (200, 200)
        this.dot = this.calculateCentroid(this.triangleVertices); // Position dot at centroid
    }

    calculateEquilateralTriangleVertices(centerX, centerY, size) {
        const height = (Math.sqrt(3) / 2) * size; // Calculate the height of the triangle
        return [
            createVector(centerX - size / 2, centerY + height / 2), // Bottom left
            createVector(centerX + size / 2, centerY + height / 2), // Bottom right
            createVector(centerX, centerY - height / 2) // Top
        ];
    }

    calculateCentroid(vertices) {
        let x = (vertices[0].x + vertices[1].x + vertices[2].x) / 3;
        let y = (vertices[0].y + vertices[1].y + vertices[2].y) / 3;
        return createVector(x, y);
    }

    draw() {
        background(255); // Set background color to white
        
        // Draw triangle with a set color
        fill(150);
        triangle(
            this.triangleVertices[0].x, this.triangleVertices[0].y,
            this.triangleVertices[1].x, this.triangleVertices[1].y,
            this.triangleVertices[2].x, this.triangleVertices[2].y
        );

        // Draw the dot
        fill(0);
        ellipse(this.dot.x, this.dot.y, 20, 20);

        // Draw vertex labels
        this.drawVertexLabels();

        // Update percentage display
        this.updatePercentageDisplay();

        this.percentages = {
            impact: 3,
            dockingScore: 3,
            length: 3,
        }
    }

    drawVertexLabels() {
        fill(0); // Set text color to black
        textSize(16);
        
        // Vertex labels
        text("Impact", this.triangleVertices[0].x - 25, this.triangleVertices[0].y + 15);
        text("Docking Score", this.triangleVertices[1].x - 60, this.triangleVertices[1].y + 15);
        text("Length", this.triangleVertices[2].x - 25, this.triangleVertices[2].y - 10);
    }

    updatePercentageDisplay() {
        const distances = this.calculateDistances(this.dot, this.triangleVertices);
        const percentages = this.calculateReversedPercentages(distances);
        this.percentages = {
            impact: percentages[0],
            dockingScore: percentages[1],
            length: percentages[2],
        }
        document.getElementById('vertex1').textContent = `Impact: ${percentages[0]}`;
        document.getElementById('vertex2').textContent = `Docking Score: ${percentages[1]}`;
        document.getElementById('vertex3').textContent = `Length: ${percentages[2]}`;
    }

    getVal() {
        return this.percentages;
    }

    calculateDistances(point, vertices) {
        return vertices.map(vertex => dist(point.x, point.y, vertex.x, vertex.y));
    }

    calculateReversedPercentages(distances) {
        // Calculate the total inverse sum
        const totalInverse = distances.reduce((acc, val) => acc + (1 / (val + 1e-10)), 0); // Adding a small value to avoid division by zero

        // Calculate the reversed percentages and apply Math.floor() to each
        return distances.map(d => {
            // Compute the percentage
            const percentage = totalInverse === 0 ? 0 : ((1 / (d + 1e-10)) / totalInverse) * 10;
            // Floor the percentage and return as an integer
            return this.roundValue(percentage);
        });
    }
    roundValue(value) {
        const factor = Math.pow(10, 0);
        return Math.round(value * factor) / factor;
    }

    mousePressed() {
        if (dist(mouseX, mouseY, this.dot.x, this.dot.y) < 10) {
            this.isDragging = true;
        }
    }

    mouseReleased() {
        this.isDragging = false;
    }

    mouseDragged() {
        if (this.isDragging) {
            let newPos = createVector(mouseX, mouseY);
            if (this.pointInTriangle(newPos, this.triangleVertices)) {
                this.dot = newPos;
            }
        }
    }

    pointInTriangle(pt, v) {
        let b0 = this.sign(pt, v[0], v[1]) < 0.0;
        let b1 = this.sign(pt, v[1], v[2]) < 0.0;
        let b2 = this.sign(pt, v[2], v[0]) < 0.0;

        return ((b0 === b1) && (b1 === b2));
    }

    sign(p1, p2, p3) {
        return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    }
}

let triangleCanvas;

function setup() {
    triangleCanvas = new TriangleCanvas('canvas-container');
}

function draw() {
    triangleCanvas.draw();
}

function mousePressed() {
    triangleCanvas.mousePressed();
}

function mouseReleased() {
    triangleCanvas.mouseReleased();
}

function mouseDragged() {
    triangleCanvas.mouseDragged();
}