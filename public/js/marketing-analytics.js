// MARKETING ANALYTICS & CONVERSION TRACKING
// Professional conversion tracking for optimizing marketing performance

class MarketingAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.interactions = [];
        
        // Initialize tracking
        this.trackPageView();
        this.initializeEventTracking();
        this.trackScrollDepth();
        this.trackTimeOnPage();
        this.trackFormInteractions();
        this.initializeROICalculator();
    }
    
    // Generate unique session identifier
    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Track page views with referrer and utm parameters
    trackPageView() {
        const params = new URLSearchParams(window.location.search);
        const pageData = {
            page: window.location.pathname,
            title: document.title,
            referrer: document.referrer,
            utm_source: params.get('utm_source'),
            utm_medium: params.get('utm_medium'),
            utm_campaign: params.get('utm_campaign'),
            timestamp: Date.now(),
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`
        };
        
        this.sendEvent('page_view', pageData);
    }
    
    // Track CTA clicks with context
    trackCTA(ctaText, ctaClass, location = null) {
        const ctaData = {
            cta_text: ctaText,
            cta_class: ctaClass,
            cta_location: location || this.getElementLocation(event.target),
            page: window.location.pathname,
            time_on_page: Date.now() - this.startTime,
            interactions_before: this.interactions.length
        };
        
        this.sendEvent('cta_click', ctaData);
        this.interactions.push({ type: 'cta_click', timestamp: Date.now(), data: ctaData });
    }
    
    // Track form interactions and completions
    trackFormInteractions() {
        // Track form focus events
        document.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                this.sendEvent('form_field_focus', {
                    field_name: e.target.name || e.target.id,
                    field_type: e.target.type,
                    page: window.location.pathname,
                    time_to_focus: Date.now() - this.startTime
                });
            }
        });
        
        // Track form submissions
        document.addEventListener('submit', (e) => {
            const formData = new FormData(e.target);
            const formFields = {};
            
            for (let [key, value] of formData.entries()) {
                formFields[key] = typeof value === 'string' ? value.substring(0, 100) : 'file';
            }
            
            this.sendEvent('form_submit', {
                form_id: e.target.id,
                form_action: e.target.action,
                form_fields: Object.keys(formFields),
                page: window.location.pathname,
                time_to_submit: Date.now() - this.startTime
            });
        });
    }
    
    // Track scroll depth for engagement measurement
    trackScrollDepth() {
        let maxScroll = 0;
        const milestones = [25, 50, 75, 90];
        const reached = new Set();
        
        const trackScroll = () => {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                
                milestones.forEach(milestone => {
                    if (scrollPercent >= milestone && !reached.has(milestone)) {
                        reached.add(milestone);
                        this.sendEvent('scroll_depth', {
                            depth: milestone,
                            page: window.location.pathname,
                            time_to_depth: Date.now() - this.startTime
                        });
                    }
                });
            }
        };
        
        window.addEventListener('scroll', this.throttle(trackScroll, 1000));
    }
    
    // Track time spent on page
    trackTimeOnPage() {
        const intervals = [30, 60, 120, 300]; // 30s, 1m, 2m, 5m
        const tracked = new Set();
        
        const trackTime = () => {
            const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
            
            intervals.forEach(interval => {
                if (timeSpent >= interval && !tracked.has(interval)) {
                    tracked.add(interval);
                    this.sendEvent('time_milestone', {
                        seconds: interval,
                        page: window.location.pathname,
                        interactions: this.interactions.length
                    });
                }
            });
        };
        
        setInterval(trackTime, 10000); // Check every 10 seconds
        
        // Track page exit
        window.addEventListener('beforeunload', () => {
            const finalTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.sendEvent('page_exit', {
                total_time: finalTime,
                page: window.location.pathname,
                total_interactions: this.interactions.length,
                max_scroll: this.getMaxScroll()
            });
        });
    }
    
    // Initialize ROI Calculator tracking
    initializeROICalculator() {
        if (document.querySelector('#agent-count')) {
            this.trackROICalculator();
        }
    }
    
    // Track ROI Calculator interactions
    trackROICalculator() {
        const inputs = ['agent-count', 'premium-avg', 'admin-hours'];
        
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', this.debounce(() => {
                    this.calculateAndTrackROI();
                }, 500));
            }
        });
    }
    
    // Calculate ROI and update display
    calculateAndTrackROI() {
        const agentCount = parseInt(document.getElementById('agent-count')?.value || 20);
        const premiumAvg = parseInt(document.getElementById('premium-avg')?.value || 50000);
        const adminHours = parseInt(document.getElementById('admin-hours')?.value || 3);
        
        // ROI Calculations (simplified)
        const timeSavedHours = adminHours * 365; // Hours saved per year
        const costReduction = timeSavedHours * 25; // $25/hour saved
        const revenueIncrease = (premiumAvg * agentCount * 12) * 0.47; // 47% increase
        const totalImpact = costReduction + revenueIncrease;
        
        // Update display
        this.updateROIDisplay({
            timeSaved: `${timeSavedHours} hours/year`,
            costSaved: `$${costReduction.toLocaleString()}/year`,
            revenueIncrease: `+$${revenueIncrease.toLocaleString()}/year`,
            totalImpact: `$${totalImpact.toLocaleString()}`
        });
        
        // Track calculation
        this.sendEvent('roi_calculation', {
            agent_count: agentCount,
            premium_avg: premiumAvg,
            admin_hours: adminHours,
            calculated_savings: costReduction,
            calculated_revenue_increase: revenueIncrease,
            total_impact: totalImpact
        });
    }
    
    // Update ROI calculator display
    updateROIDisplay(values) {
        const elements = {
            'time-saved': values.timeSaved,
            'cost-saved': values.costSaved,
            'revenue-increase': values.revenueIncrease,
            'roi-total-value': values.totalImpact
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                
                // Add highlight animation
                element.style.color = 'var(--accent)';
                element.style.transition = 'color 0.5s ease';
                setTimeout(() => {
                    element.style.color = '';
                }, 2000);
            }
        });
    }
    
    // Initialize event tracking for all interactive elements
    initializeEventTracking() {
        // Track all CTA clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-cta, .btn-hero-primary, .btn-cta-primary, .btn-primary, .plan-cta')) {
                this.trackCTA(
                    e.target.textContent.trim(),
                    e.target.className,
                    this.getElementLocation(e.target)
                );
            }
        });
        
        // Track navigation clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-menu a, .footer-links a')) {
                this.sendEvent('navigation_click', {
                    link_text: e.target.textContent.trim(),
                    link_href: e.target.href,
                    location: e.target.matches('.nav-menu a') ? 'header' : 'footer'
                });
            }
        });
        
        // Track social proof interactions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.testimonial, .metric, .trust-logos')) {
                this.sendEvent('social_proof_interaction', {
                    element_type: e.target.closest('.testimonial') ? 'testimonial' : 
                                 e.target.closest('.metric') ? 'metric' : 'trust_logo',
                    page: window.location.pathname
                });
            }
        });
    }
    
    // Send event to analytics endpoint
    sendEvent(eventName, data) {
        const eventData = {
            event: eventName,
            session_id: this.sessionId,
            timestamp: Date.now(),
            user_agent: navigator.userAgent,
            url: window.location.href,
            ...data
        };
        
        // Send to analytics endpoint (replace with your actual endpoint)
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/analytics', JSON.stringify(eventData));
        } else {
            fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData),
                keepalive: true
            }).catch(err => console.warn('Analytics tracking failed:', err));
        }
        
        // Also log to console for development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('📊 Analytics Event:', eventName, data);
        }
    }
    
    // Utility functions
    getElementLocation(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2),
            section: this.getElementSection(element)
        };
    }
    
    getElementSection(element) {
        const sections = ['hero', 'features', 'testimonials', 'pricing', 'footer'];
        for (let section of sections) {
            if (element.closest(`.${section}`)) {
                return section;
            }
        }
        return 'unknown';
    }
    
    getMaxScroll() {
        return Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    debounce(func, wait) {
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
}

// A/B Testing Framework
class ABTesting {
    constructor() {
        this.tests = {
            hero_headline: {
                control: "The Only Insurance Platform That Runs Your Entire Agency",
                variant: "Stop Losing $89,000/Year to Manual Admin Work"
            },
            cta_primary: {
                control: "Start 14-Day Free Trial",
                variant: "See Live Demo First"
            },
            pricing_highlight: {
                control: "Most Popular",
                variant: "Best Value"
            }
        };
        
        this.runTests();
    }
    
    runTests() {
        Object.keys(this.tests).forEach(testName => {
            const variant = Math.random() > 0.5 ? 'variant' : 'control';
            this.applyVariant(testName, variant);
            this.trackVariant(testName, variant);
        });
    }
    
    applyVariant(testName, variant) {
        const elements = document.querySelectorAll(`[data-ab-test="${testName}"]`);
        elements.forEach(element => {
            const newText = this.tests[testName][variant];
            if (newText) {
                element.textContent = newText;
                element.setAttribute('data-ab-variant', variant);
            }
        });
    }
    
    trackVariant(testName, variant) {
        if (window.analytics) {
            window.analytics.sendEvent('ab_test_assigned', {
                test: testName,
                variant: variant
            });
        }
    }
}

// Lead scoring system
class LeadScoring {
    constructor() {
        this.score = 0;
        this.actions = [];
        this.startTracking();
    }
    
    startTracking() {
        // Increase score for high-intent actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-cta, .btn-hero-primary')) {
                this.addScore('cta_click', 25);
            } else if (e.target.matches('[href="/pricing.html"]')) {
                this.addScore('pricing_view', 20);
            } else if (e.target.matches('[href="/demo.html"]')) {
                this.addScore('demo_request', 30);
            }
        });
        
        // Score based on time spent
        setTimeout(() => this.addScore('time_30s', 5), 30000);
        setTimeout(() => this.addScore('time_2m', 10), 120000);
        setTimeout(() => this.addScore('time_5m', 20), 300000);
        
        // Score for form interactions
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input[type="email"], input[type="tel"]')) {
                this.addScore('contact_intent', 15);
            }
        });
    }
    
    addScore(action, points) {
        this.score += points;
        this.actions.push({ action, points, timestamp: Date.now() });
        
        if (window.analytics) {
            window.analytics.sendEvent('lead_score_change', {
                action,
                points_added: points,
                total_score: this.score,
                qualification_level: this.getQualificationLevel()
            });
        }
        
        // Trigger high-intent actions for qualified leads
        if (this.score >= 50 && !this.hasTriggeredHighIntent) {
            this.triggerHighIntentActions();
        }
    }
    
    getQualificationLevel() {
        if (this.score >= 75) return 'hot';
        if (this.score >= 50) return 'warm';
        if (this.score >= 25) return 'interested';
        return 'cold';
    }
    
    triggerHighIntentActions() {
        this.hasTriggeredHighIntent = true;
        
        // Could trigger exit-intent popup, special offer, etc.
        console.log('🔥 High-intent lead detected! Score:', this.score);
        
        if (window.analytics) {
            window.analytics.sendEvent('high_intent_lead', {
                score: this.score,
                actions: this.actions,
                qualification: this.getQualificationLevel()
            });
        }
    }
}

// Initialize all tracking systems
document.addEventListener('DOMContentLoaded', () => {
    // Initialize analytics
    window.analytics = new MarketingAnalytics();
    
    // Initialize A/B testing
    window.abTesting = new ABTesting();
    
    // Initialize lead scoring
    window.leadScoring = new LeadScoring();
    
    console.log('🚀 Marketing analytics initialized');
});