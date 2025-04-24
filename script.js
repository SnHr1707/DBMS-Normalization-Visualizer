//Add a new functional dependency row
global_cand_keys = []
function addFDRow() {
    const container = document.getElementById('fd-container');
    const row = document.createElement('div');
    row.className = 'fd-row';
    row.innerHTML = `
        <input type="text" class="fd-left" placeholder="Left side (determinant) e.g. A,B">
        <span class="arrow">→</span>
        <input type="text" class="fd-right" placeholder="Right side (dependent) e.g. C,D">
        <button class="remove-fd-btn">X</button>
    `;
    container.appendChild(row);

    row.querySelector('.remove-fd-btn').addEventListener('click', function () {
        container.removeChild(row);
    });
}

//Remove buttons for existing rows
document.querySelectorAll('.remove-fd-btn').forEach(button => {
    button.addEventListener('click', function () {
        const row = this.parentNode;
        row.parentNode.removeChild(row);
    });
});

// Main normalization function
function normalizeTable() {
    // Get input values
    const columnsInput = document.getElementById('columns').value.trim();
    if (!columnsInput) {
        showError("Please enter column names.");
        return;
    }

    // Parse columns
    const columns = columnsInput.split(',').map(col => col.trim()).filter(col => col);
    if (columns.length === 0) {
        showError("Please enter valid column names.");
        return;
    }

    // Parse functional dependencies
    const fdRows = document.querySelectorAll('.fd-row');
    const fds = [];

    for (const row of fdRows) {
        const leftInput = row.querySelector('.fd-left').value.trim();
        const rightInput = row.querySelector('.fd-right').value.trim();

        if (!leftInput || !rightInput) continue;

        const left = leftInput.split(',').map(attr => attr.trim()).filter(attr => attr);
        const right = rightInput.split(',').map(attr => attr.trim()).filter(attr => attr);

        if (left.length === 0 || right.length === 0) continue;

        // Validate that all attributes exist in the columns
        const allAttrs = [...left, ...right];
        const invalidAttrs = allAttrs.filter(attr => !columns.includes(attr));

        if (invalidAttrs.length > 0) {
            showError(`Invalid attributes: ${invalidAttrs.join(', ')}. All attributes must be in the column list.`);
            return;
        }

        fds.push({ left, right });
    }

    if (fds.length === 0) {
        showError("Please enter at least one functional dependency.");
        return;
    }

    // Clear previous results
    document.getElementById('normalization-steps').innerHTML = '';
    document.getElementById('result-section').style.display = 'block';

    // Start normalization process
    const normalized2NF = normalizeTo2NF(columns, fds);
    const normalized3NF = normalizeTo3NF(normalized2NF.attributes, normalized2NF.fds);
    normalizeToBCNF(normalized3NF.attributes, normalized3NF.fds);
}

// Function to display errors
function showError(message) {
    const resultSection = document.getElementById('result-section');
    resultSection.style.display = 'block';
    document.getElementById('normalization-steps').innerHTML = `<div class="error">${message}</div>`;
}

// Function to add a step in the normalization process
function addStep(title, content) {
    const stepsContainer = document.getElementById('normalization-steps');
    const step = document.createElement('div');
    step.className = 'step';
    step.innerHTML = `
        <div class="step-title">${title}</div>
        <div>${content}</div>
    `;
    stepsContainer.appendChild(step);
}

// Function to render a table
function renderTable(name, attributes, primaryKey) {
    const pkAttributes = Array.isArray(primaryKey) ? primaryKey : [primaryKey];
    const formattedAttributes = attributes.map(attr =>
        pkAttributes.includes(attr) ? `<span class="primary-key">${attr}</span>` : attr
    ).join(', ');

    return `
        <div class="table">
            <div class="table-name">${name}</div>
            <div>(${formattedAttributes})</div>
        </div>
    `;
}

// Function to render functional dependencies
function renderFDs(fds) {
    if (fds.length === 0) return '<p>No functional dependencies.</p>';

    return `
        <ul class="fd-list">
            ${fds.map(fd => `<li>${fd.left.join(', ')} → ${fd.right.join(', ')}</li>`).join('')}
        </ul>
    `;
}

// Function to compute the closure of a set of attributes
function computeClosure(attributes, fds) {
    let closure = [...attributes];
    let changed = true;

    while (changed) {
        changed = false;
        
        //Permutating over all combinations
        for (const fd of fds) {
            const leftIncluded = fd.left.every(attr => closure.includes(attr));

            if (leftIncluded) {
                for (const attr of fd.right) {
                    if (!closure.includes(attr)) {
                        closure.push(attr);
                        changed = true;
                    }
                }
            }
        }
    }

    return closure;
}


//   CHECK DIS SHREY

//Find all candidate keys
function findCandidateKeys(attributes, fds) {
    //Get only left
    const rightSideAttrs = new Set();
    fds.forEach(fd => fd.right.forEach(attr => rightSideAttrs.add(attr)));

    const leftOnlyAttrs = attributes.filter(attr => !rightSideAttrs.has(attr));

    // Start with just the left-only attributes
    let candidateKeys = [];

    // If the closure of left-only attributes includes all attributes, it's a candidate key
    if (leftOnlyAttrs.length > 0) {
        const closure = computeClosure(leftOnlyAttrs, fds);
        if (closure.length === attributes.length) {
            candidateKeys.push(leftOnlyAttrs);
            return candidateKeys;
        }
    }

    const remainingAttrs = attributes.filter(attr => !leftOnlyAttrs.includes(attr));

    // Try all possible combinations of remaining attributes
    for (let i = 1; i <= remainingAttrs.length; i++) {
        const combinations = getCombinations(remainingAttrs, i);

        for (const combo of combinations) {
            const potentialKey = [...leftOnlyAttrs, ...combo];
            const closure = computeClosure(potentialKey, fds);

            if (closure.length === attributes.length) {
                let isMinimal = true;
                for (const key of candidateKeys) {
                    if (isSubset(key, potentialKey)) {
                        isMinimal = false;
                        break;
                    }
                }

                if (isMinimal) {
                    // Remove if superset
                    //THIS MIGHT NOT WORK CORRECT THIS(CHECK Shrey).
                    candidateKeys = candidateKeys.filter(key => !isSubset(potentialKey, key));
                    candidateKeys.push(potentialKey);
                }
            }
        }
    }

    //Try the entire set of attributes
    if (candidateKeys.length === 0) {
        candidateKeys.push(attributes);
    }
    return candidateKeys;
}

//if a is a subset of b?
function isSubset(a, b) {
    return a.every(item => b.includes(item));
}

// Get all combinations of set
function getCombinations(array, size) {
    const result = [];

    function backtrack(start, current) {
        if (current.length === size) {
            result.push([...current]);
            return;
        }

        for (let i = start; i < array.length; i++) {
            current.push(array[i]);
            backtrack(i + 1, current);
            current.pop();
        }
    }

    backtrack(0, []);
    return result;
}

// Check if an FD violates BCNF
function violatesBCNF(fd, candidateKeys, attributes) {
    const closure = computeClosure(fd.left, [fd]);
    if (closure.length === attributes.length) return false; // Left side is a superkey

    for (const key of candidateKeys) {
        if (isSubset(key, fd.left)) {
            return false; // Left side is a superkey (contains a candidate key)
        }
    }

    return true;
}

// Check if an FD violates 3NF
function violates3NF(fd, candidateKeys, attributes) {
    // If the left side is a superkey, it doesn't violate 3NF
    const closure = computeClosure(fd.left, [fd]);
    if (closure.length === attributes.length) return false;

    // If every attribute on the right side is a prime attribute, it doesn't violate 3NF
    const primeAttributes = new Set();
    candidateKeys.forEach(key => key.forEach(attr => primeAttributes.add(attr)));
    if (fd.right.every(attr => primeAttributes.has(attr))) return false;

    // Otherwise, it violates 3NF
    return true;
}

// Function for 2NF normalization
function normalizeTo2NF(attributes, fds) {
    // 1. First Normal Form (1NF)
    addStep("Step 1: First Normal Form (1NF)", `
        <p>Assuming the table is already in 1NF (all attributes have atomic values).</p>
        ${renderTable("Original Table", attributes, [])}
        <p>Functional Dependencies:</p>
        ${renderFDs(fds)}
    `);

    // 2. Find Candidate Keys
    const candidateKeys = findCandidateKeys(attributes, fds);
    global_cand_keys = candidateKeys
    console.log(candidateKeys)

    addStep("Step 2: Find Candidate Keys", `
        <p>Candidate Keys for Original Table:</p>
        <ul>
            ${global_cand_keys.map(key => `<li>(${key.join(', ')})</li>`).join('')}
        </ul>
    `);

    // 3. Identify Prime Attributes (attributes that are part of any candidate key)
    const primeAttributes = new Set();
    candidateKeys.forEach(key => key.forEach(attr => primeAttributes.add(attr)));

    // 4. Check for partial dependencies (where a non-prime attribute depends on part of a candidate key)
    let partialDependencies = [];

    for (const fd of fds) {
        // Skip if the right side contains only prime attributes
        if (fd.right.every(attr => primeAttributes.has(attr))) continue;

        // Check if the left side is a proper subset of any candidate key
        const isPartialDependency = candidateKeys.some(key => {
            return key.length > 1 && // The key must have multiple attributes
                isSubset(fd.left, key) && // Left side must be subset of the key
                !isSubset(key, fd.left);  // But not equal to the key
        });

        if (isPartialDependency) {
            partialDependencies.push(fd);
        }
    }

    let step3Content;
    if (partialDependencies.length === 0) {
        step3Content = `
            <p>The table is already in 2NF as there are no partial dependencies.</p>
        `;
    } else {
        step3Content = `
            <p>The table is not in 2NF due to the following partial dependencies:</p>
            ${renderFDs(partialDependencies)}
            <p>Decomposing the table to remove partial dependencies...</p>
        `;
    }

    step3Content += `
        <p>Key points about 2NF:</p>
        <ul>
            <li>All non-prime attributes are fully functionally dependent on each candidate key</li>
            <li>There are no partial dependencies of non-prime attributes on candidate keys</li>
            <li>This decomposition is lossless and dependency-preserving</li>
        </ul>
    `;

    addStep("Step 3: Second Normal Form (2NF)", step3Content);


    // 5. Decompose to 2NF
    let tables2NF = [];

    // Create a table for each partial dependency
    for (const fd of partialDependencies) {
        // Gather all attributes functionally determined by the left side
        const determinedAttrs = [];
        for (const attr of attributes) {
            if (!fd.left.includes(attr)) {
                const attrClosure = computeClosure(fd.left, fds);
                if (attrClosure.includes(attr)) {
                    determinedAttrs.push(attr);
                }
            }
        }

        const tableAttrs = [...fd.left, ...determinedAttrs];
        const tableFDs = fds.filter(f =>
            isSubset(f.left, tableAttrs) &&
            isSubset(f.right, tableAttrs)
        );

        tables2NF.push({
            name: `Table_${tables2NF.length + 1}`,
            attributes: tableAttrs,
            primaryKey: fd.left,
            fds: tableFDs
        });
    }

    // Create a table for the composite key and any remaining attributes
    const handledAttrs = new Set();
    tables2NF.forEach(table =>
        table.attributes.forEach(attr => handledAttrs.add(attr))
    );

    const remainingAttrs = attributes.filter(attr => !handledAttrs.has(attr));
    if (remainingAttrs.length > 0 || candidateKeys.length > 0) {
        // Include at least one candidate key
        const tableAttrs = [...new Set([...remainingAttrs, ...candidateKeys[0]])];
        const tableFDs = fds.filter(f =>
            isSubset(f.left, tableAttrs) &&
            isSubset(f.right, tableAttrs)
        );

        tables2NF.push({
            name: `Table_${tables2NF.length + 1}`,
            attributes: tableAttrs,
            primaryKey: candidateKeys[0],
            fds: tableFDs
        });
    }

    // Render 2NF tables
    let tables2NFHtml = '';
    let combinedAttrs = [];
    let combinedFds = [];

    tables2NF.forEach(table => {
        tables2NFHtml += renderTable(table.name, table.attributes, table.primaryKey);
        tables2NFHtml += `<p>Functional Dependencies:</p>`;
        tables2NFHtml += renderFDs(table.fds);
        combinedAttrs = combinedAttrs.concat(table.attributes);
        combinedFds = combinedFds.concat(table.fds);
    });

    addStep("2NF Decomposition Result", tables2NFHtml);

    // Final summary
    addStep("Final Result", `
        <p>The normalization process to 2NF is complete.</p>
    `);

    return { attributes: combinedAttrs, fds: combinedFds };
}

// I wrote this at night check this Shrey might be wrong
// Also add the frontend on this <p> stuff and all.
// EDIT STYLES
// Function for 3NF normalization
function normalizeTo3NF(attributes, fds) {
    // Find Candidate Keys
    const candidateKeys = findCandidateKeys(attributes, fds);
    console.log(candidateKeys)

    addStep("Step 4: Find Candidate Keys for 3NF", `
        <p>Candidate Keys for the tables from 2NF:</p>
        <ul>
            ${global_cand_keys.map(key => `<li>(${key.join(', ')})</li>`).join('')}
        </ul>
    `);

    // Check for 3NF violations
    let thirdNFViolations = [];
    for (const fd of fds) {
        if (violates3NF(fd, candidateKeys, attributes)) {
            thirdNFViolations.push(fd);
        }
    }

    let step5Content;
    if (thirdNFViolations.length === 0) {
        step5Content = `
            <p>The table is already in 3NF as there are no 3NF violations.</p>
        `;
    } else {
        step5Content = `
            <p>The table is not in 3NF due to the following violations:</p>
            ${renderFDs(thirdNFViolations)}
            <p>Decomposing the table to achieve 3NF...</p>
        `;
    }

    step5Content += `
        <p>Key points about 3NF:</p>
        <ul>
            <li>No non-prime attribute is transitively dependent on any candidate key</li>
            <li>The decomposition is lossless and dependency-preserving</li>
        </ul>
    `;
    addStep("Step 5: Third Normal Form (3NF)", step5Content);


    // Decompose to 3NF
    let tables3NF = [];

    // Create a table for each 3NF violation
    for (const fd of thirdNFViolations) {
        const tableAttrs = [...new Set([...fd.left, ...fd.right])];
        const tableFDs = fds.filter(f =>
            isSubset(f.left, tableAttrs) &&
            isSubset(f.right, tableAttrs)
        );
        tables3NF.push({
            name: `Table_${tables3NF.length + 1}`,
            attributes: tableAttrs,
            primaryKey: fd.left,
            fds: tableFDs
        });
    }

    // Create a table for the composite key and any remaining attributes
    const handledAttrs = new Set();
    tables3NF.forEach(table =>
        table.attributes.forEach(attr => handledAttrs.add(attr))
    );

    const remainingAttrs = attributes.filter(attr => !handledAttrs.has(attr));
    if (remainingAttrs.length > 0 || candidateKeys.length > 0) {
        const tableAttrs = [...new Set([...remainingAttrs, ...candidateKeys[0]])];
        const tableFDs = fds.filter(f =>
            isSubset(f.left, tableAttrs) &&
            isSubset(f.right, tableAttrs)
        );
        tables3NF.push({
            name: `Table_${tables3NF.length + 1}`,
            attributes: tableAttrs,
            primaryKey: candidateKeys[0],
            fds: tableFDs
        });
    }

    // Render 3NF tables
    let tables3NFHtml = '';
    let combinedAttrs = [];
    let combinedFds = [];
    tables3NF.forEach(table => {
        tables3NFHtml += renderTable(table.name, table.attributes, table.primaryKey);
        tables3NFHtml += `<p>Functional Dependencies:</p>`;
        tables3NFHtml += renderFDs(table.fds);
        combinedAttrs = combinedAttrs.concat(table.attributes);
        combinedFds = combinedFds.concat(table.fds);
    });
    addStep("3NF Decomposition Result", tables3NFHtml);

    addStep("Final Result", `
        <p>The normalization process to 3NF is complete.</p>
    `);

    return { attributes: combinedAttrs, fds: combinedFds };
}

// Function for BCNF normalization
function normalizeToBCNF(attributes, fds) {
    // Find Candidate Keys
    const candidateKeys = findCandidateKeys(attributes, fds);
    console.log(candidateKeys)

    addStep("Step 6: Find Candidate Keys for BCNF", `
        <p>Candidate Keys for the tables from 3NF:</p>
        <ul>
            ${global_cand_keys.map(key => `<li>(${key.join(', ')})</li>`).join('')}
        </ul>
    `);

    // Check for BCNF violations
    let bcnfViolations = [];
    for (const fd of fds) {
        if (violatesBCNF(fd, candidateKeys, attributes)) {
            bcnfViolations.push(fd);
        }
    }

    let step7Content;
    if (bcnfViolations.length === 0) {
        step7Content = `
            <p>The table is already in BCNF as there are no BCNF violations.</p>
        `;
    } else {
        step7Content = `
            <p>The table is not in BCNF due to the following violations:</p>
            ${renderFDs(bcnfViolations)}
            <p>Decomposing the table to achieve BCNF...</p>
        `;
    }

    step7Content += `
        <p>Key points about BCNF:</p>
        <ul>
            <li>For every non-trivial functional dependency X → Y, X is a superkey</li>
            <li>This decomposition is lossless but might not preserve all dependencies</li>
            <li>BCNF is a stronger form of 3NF</li>
        </ul>
    `;

    addStep("Step 7: Boyce-Codd Normal Form (BCNF)", step7Content);


    // Decompose to BCNF
    let decomposedRelations = [{
        attributes: [...attributes],
        fds: [...fds]
    }];

    // Process each decomposed relation until all are in BCNF
    let finalRelations = [];
    while (decomposedRelations.length > 0) {
        const relation = decomposedRelations.pop();
        const relAttrs = relation.attributes;
        const relFDs = relation.fds;

        // Find candidate keys for this relation
        const relCandidateKeys = findCandidateKeys(relAttrs, relFDs);

        // Check for BCNF violations in this relation
        let violationFound = false;
        for (const fd of relFDs) {
            if (violatesBCNF(fd, relCandidateKeys, relAttrs)) {
                violationFound = true;

                // Decompose based on this violation
                const X = fd.left;
                const Y = fd.right;

                // First relation: X → Y
                const r1Attrs = [...new Set([...X, ...Y])];
                const r1FDs = relFDs.filter(f =>
                    isSubset(f.left, r1Attrs) &&
                    isSubset(f.right, r1Attrs)
                );

                // Second relation: X and remaining attributes except Y
                const r2Attrs = [...new Set([
                    ...X,
                    ...relAttrs.filter(attr => !Y.includes(attr))
                ])];
                const r2FDs = relFDs.filter(f =>
                    isSubset(f.left, r2Attrs) &&
                    isSubset(f.right, r2Attrs)
                );

                // Add decomposed relations back to the queue
                decomposedRelations.push({
                    attributes: r1Attrs,
                    fds: r1FDs
                });

                decomposedRelations.push({
                    attributes: r2Attrs,
                    fds: r2FDs
                });

                break;
            }
        }

        // If no violations, this relation is in BCNF
        if (!violationFound) {
            finalRelations.push({
                attributes: relAttrs,
                fds: relFDs,
                candidateKeys: relCandidateKeys
            });
        }
    }

    // Render BCNF relations
    let bcnfTablesHtml = '';
    finalRelations.forEach((rel, index) => {
        bcnfTablesHtml += renderTable(`Table_${index + 1}`, rel.attributes, rel.candidateKeys[0]);
        bcnfTablesHtml += `<p>Functional Dependencies:</p>`;
        bcnfTablesHtml += renderFDs(rel.fds);
    });

    addStep("BCNF Decomposition Result", bcnfTablesHtml);

    addStep("Final Result", `
        <p>The normalization process to BCNF is complete.</p>
    `);
}