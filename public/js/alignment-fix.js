// UNIVERSAL ALIGNMENT FIXER
// Run this to ensure all elements are perfectly aligned

function fixAllAlignments() {
    console.log('Starting alignment fixes...');
    
    // Find all cards and ensure uniform height within each row
    const allCards = document.querySelectorAll('.card, .metric-card, .dashboard-card, .leaderboard-metric');
    
    if (allCards.length > 0) {
        // Group cards by their vertical position (row)
        const cardRows = {};
        allCards.forEach(card => {
            const top = card.getBoundingClientRect().top;
            const roundedTop = Math.round(top / 10) * 10; // Group by 10px intervals
            if (!cardRows[roundedTop]) {
                cardRows[roundedTop] = [];
            }
            cardRows[roundedTop].push(card);
        });
        
        // Set uniform height per row
        Object.values(cardRows).forEach(row => {
            if (row.length > 1) { // Only fix if multiple cards in row
                const maxHeight = Math.max(...row.map(card => card.offsetHeight));
                row.forEach(card => {
                    card.style.minHeight = `${maxHeight}px`;
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    card.style.justifyContent = 'space-between';
                });
            }
        });
        
        console.log(`Fixed alignment for ${Object.keys(cardRows).length} card rows`);
    }
    
    // Fix table column alignments
    const tables = document.querySelectorAll('table, .data-table');
    tables.forEach((table, tableIndex) => {
        const firstRow = table.querySelector('thead tr, tbody tr:first-child');
        if (firstRow) {
            const cells = firstRow.querySelectorAll('th, td');
            cells.forEach((cell, columnIndex) => {
                const width = cell.offsetWidth;
                
                // Apply consistent width to all cells in this column
                const columnCells = table.querySelectorAll(`tr > :nth-child(${columnIndex + 1})`);
                columnCells.forEach(c => {
                    c.style.minWidth = `${width}px`;
                    c.style.maxWidth = `${width}px`;
                });
            });
        }
        console.log(`Fixed table ${tableIndex + 1} column alignment`);
    });
    
    // Fix button group alignments
    const buttonGroups = document.querySelectorAll('.button-group, .btn-group, .leaderboard-filters');
    buttonGroups.forEach((group, groupIndex) => {
        const buttons = group.querySelectorAll('button, .btn, input[type="submit"], select');
        if (buttons.length > 1) {
            const maxHeight = Math.max(...Array.from(buttons).map(btn => btn.offsetHeight));
            buttons.forEach(btn => {
                btn.style.height = `${maxHeight}px`;
                btn.style.display = 'inline-flex';
                btn.style.alignItems = 'center';
                btn.style.justifyContent = 'center';
            });
            console.log(`Fixed button group ${groupIndex + 1} alignment`);
        }
    });
    
    // Fix form input alignments
    const forms = document.querySelectorAll('form, .form-group');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type !== 'hidden' && input.type !== 'checkbox' && input.type !== 'radio') {
                input.style.height = '36px';
                input.style.boxSizing = 'border-box';
            }
        });
    });
    
    // Fix navigation alignments
    const navItems = document.querySelectorAll('.nav-item, .nav-link, .leaderboard-tab');
    navItems.forEach(item => {
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.minHeight = '40px';
    });
    
    // Fix metric value alignments
    const metricValues = document.querySelectorAll('.metric-value, .leaderboard-metric-value');
    metricValues.forEach(value => {
        value.style.display = 'flex';
        value.style.alignItems = 'center';
        value.style.justifyContent = 'center';
        value.style.lineHeight = '1';
    });
    
    // Fix podium alignments (specific to leaderboard)
    const podiumPlaces = document.querySelectorAll('.podium-place');
    if (podiumPlaces.length > 0) {
        const maxHeight = Math.max(...Array.from(podiumPlaces).map(place => place.offsetHeight));
        podiumPlaces.forEach(place => {
            place.style.minHeight = `${maxHeight}px`;
        });
        console.log('Fixed podium alignment');
    }
    
    // Apply theme-specific fixes
    if (document.documentElement.classList.contains('theme-professional')) {
        // Professional theme specific alignments
        const professionalCards = document.querySelectorAll('.theme-professional .metric-card');
        professionalCards.forEach(card => {
            card.style.padding = 'var(--spacing-lg)';
            card.style.gap = 'var(--spacing-md)';
        });
    }
    
    console.log('Alignment fixes completed successfully');
}

// Fix spacing inconsistencies
function fixSpacing() {
    // Apply consistent spacing to common elements
    const spacingFixes = [
        { selector: '.dashboard-grid, .metrics-grid', property: 'gap', value: 'var(--spacing-md, 16px)' },
        { selector: '.card, .metric-card', property: 'padding', value: 'var(--spacing-lg, 24px)' },
        { selector: '.btn', property: 'padding', value: '0 var(--spacing-md, 16px)' },
        { selector: '.form-group', property: 'marginBottom', value: 'var(--spacing-md, 16px)' },
        { selector: 'h1, h2, h3', property: 'marginBottom', value: 'var(--spacing-md, 16px)' }
    ];
    
    spacingFixes.forEach(fix => {
        const elements = document.querySelectorAll(fix.selector);
        elements.forEach(el => {
            el.style[fix.property] = fix.value;
        });
    });
}

// Fix responsive issues
function fixResponsive() {
    const viewport = window.innerWidth;
    
    // Mobile fixes
    if (viewport <= 768) {
        // Stack cards vertically on mobile
        const cardContainers = document.querySelectorAll('.metrics-grid, .leaderboard-metrics');
        cardContainers.forEach(container => {
            container.style.gridTemplateColumns = '1fr';
            container.style.gap = 'var(--spacing-md, 16px)';
        });
        
        // Stack podium vertically on mobile
        const podium = document.querySelector('.rankings-podium');
        if (podium) {
            podium.style.gridTemplateColumns = '1fr';
        }
        
        // Make tables horizontally scrollable
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            if (!table.closest('.table-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-wrapper';
                wrapper.style.overflowX = 'auto';
                wrapper.style.width = '100%';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });
    }
    
    // Tablet fixes
    if (viewport > 768 && viewport <= 1024) {
        const cardContainers = document.querySelectorAll('.metrics-grid, .leaderboard-metrics');
        cardContainers.forEach(container => {
            container.style.gridTemplateColumns = 'repeat(2, 1fr)';
        });
    }
}

// Debounce function to prevent excessive calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Main initialization function
function initializeAlignmentFixes() {
    // Initial fixes
    fixAllAlignments();
    fixSpacing();
    fixResponsive();
    
    // Set up resize observer for dynamic fixes
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(debounce(() => {
            fixAllAlignments();
            fixResponsive();
        }, 250));
        
        // Observe body for layout changes
        resizeObserver.observe(document.body);
    }
    
    // Set up mutation observer for dynamic content
    if (window.MutationObserver) {
        const mutationObserver = new MutationObserver(debounce(() => {
            fixAllAlignments();
        }, 500));
        
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAlignmentFixes);
} else {
    initializeAlignmentFixes();
}

// Re-run fixes on window resize
window.addEventListener('resize', debounce(() => {
    fixAllAlignments();
    fixResponsive();
}, 250));

// Export functions for manual use
window.alignmentFixer = {
    fixAll: fixAllAlignments,
    fixSpacing: fixSpacing,
    fixResponsive: fixResponsive,
    init: initializeAlignmentFixes
};

// Add CSS for common alignment issues
const alignmentCSS = `
/* Universal alignment improvements */
.theme-professional * {
    box-sizing: border-box;
}

.theme-professional .metrics-grid,
.theme-professional .leaderboard-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-md, 16px);
    align-items: stretch;
}

.theme-professional .metric-card,
.theme-professional .leaderboard-metric {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 120px;
}

.theme-professional table {
    table-layout: fixed;
    width: 100%;
}

.theme-professional .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
}

.theme-professional input,
.theme-professional select {
    height: 36px;
    box-sizing: border-box;
}

.table-wrapper {
    overflow-x: auto;
    width: 100%;
    -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {
    .theme-professional .metrics-grid,
    .theme-professional .leaderboard-metrics {
        grid-template-columns: 1fr !important;
    }
    
    .theme-professional .rankings-podium {
        grid-template-columns: 1fr !important;
    }
}
`;

// Inject alignment CSS
const styleElement = document.createElement('style');
styleElement.textContent = alignmentCSS;
document.head.appendChild(styleElement);

console.log('Alignment fixer initialized successfully');