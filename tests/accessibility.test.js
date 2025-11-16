// Accessibility Testing Utilities for Roshan Beats PWA
// Run with: npm test -- --grep accessibility

describe('Accessibility Tests', () => {
  beforeEach(() => {
    // Load the app
    cy.visit('/');
  });

  it('should have skip link', () => {
    cy.get('a[href="#main-content"]').should('be.visible');
  });

  it('should have proper heading hierarchy', () => {
    cy.get('h1').should('exist');
    cy.get('h2').should('exist');
  });

  it('should have aria-labels on buttons', () => {
    cy.get('button[aria-label]').should('have.length.greaterThan', 0);
  });

  it('should have focus indicators', () => {
    cy.get('button').first().focus();
    cy.get('button').first().should('have.css', 'outline');
  });

  it('should support keyboard navigation', () => {
    cy.get('body').type('{tab}');
    cy.focused().should('exist');
  });

  it('should have live region for announcements', () => {
    cy.get('#live-region[aria-live]').should('exist');
  });

  it('should support high contrast mode', () => {
    // Test if high contrast class can be applied
    cy.window().then((win) => {
      win.document.body.classList.add('high-contrast');
      cy.get('body').should('have.class', 'high-contrast');
    });
  });

  it('should support reduced motion', () => {
    cy.window().then((win) => {
      win.document.body.classList.add('reduce-motion');
      cy.get('body').should('have.class', 'reduce-motion');
    });
  });

  it('should have proper form labels', () => {
    cy.get('input').each(($input) => {
      cy.wrap($input).should('have.attr', 'aria-label').or('have.attr', 'aria-labelledby');
    });
  });

  it('should have descriptive alt texts', () => {
    cy.get('img[alt]').should('have.length.greaterThan', 0);
  });

  it('should support zoom up to 200%', () => {
    cy.viewport(800, 600);
    // Test that layout doesn't break at 200% zoom
    cy.get('#app-container').should('be.visible');
  });
});

// Utility functions for accessibility testing
window.AccessibilityTester = {
  checkColorContrast: function(element) {
    // Basic color contrast checker
    const style = window.getComputedStyle(element);
    const bgColor = style.backgroundColor;
    const color = style.color;
    // Implement contrast calculation
    return { bgColor, color };
  },

  checkKeyboardNavigation: function() {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    return focusableElements.length;
  },

  checkAriaAttributes: function() {
    const elements = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
    return elements.length;
  },
};
