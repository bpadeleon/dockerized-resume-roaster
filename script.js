class ResumeRoaster {
    constructor() {
        this.currentPage = 'landing-page';
        this.resumeData = null;
        this.analysisResults = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFileUpload();
    }

    setupEventListeners() {
        // File upload
        const fileInput = document.getElementById('resume-upload');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // Drag and drop
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('click', () => {
                document.getElementById('resume-upload').click();
            });
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadArea = document.getElementById('upload-area');
        uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadArea = document.getElementById('upload-area');
        uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadArea = document.getElementById('upload-area');
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        // Validate file type
        const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|doc|docx)$/i)) {
            this.showError('Please upload a PDF, TXT, DOC, or DOCX file.');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size must be less than 10MB.');
            return;
        }

        // Show file info
        this.showFileInfo(file);
        
        // Start analysis
        setTimeout(() => {
            this.startAnalysis(file);
        }, 1500);
    }

    showFileInfo(file) {
        const uploadArea = document.getElementById('upload-area');
        uploadArea.classList.add('has-file');
        
        const existingInfo = uploadArea.querySelector('.file-info');
        if (existingInfo) {
            existingInfo.remove();
        }

        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = `
            <strong>📄 ${file.name}</strong><br>
            <span>${this.formatFileSize(file.size)} - Ready to roast!</span>
        `;
        uploadArea.appendChild(fileInfo);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        const uploadArea = document.getElementById('upload-area');
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        uploadArea.parentNode.insertBefore(errorDiv, uploadArea.nextSibling);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    async startAnalysis(file) {
        this.showPage('loading-page');
        
        // Simulate loading reactions
        this.showLoadingReactions();
        
        try {
            // Create FormData to send file
            const formData = new FormData();
            formData.append('resume', file);

            // Send to backend for analysis
            const response = await fetch('/api/analyze-resume', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const results = await response.json();
            this.analysisResults = results;
            
            // Wait a bit more for dramatic effect
            setTimeout(() => {
                this.showResults(results);
            }, 2000);

        } catch (error) {
            console.error('Analysis error:', error);
            // Fallback to demo results
            setTimeout(() => {
                this.showDemoResults();
            }, 3000);
        }
    }

    showLoadingReactions() {
        const reactions = [
            { id: 'reaction-1', delay: 2000, text: 'lol' },
            { id: 'reaction-2', delay: 4000, text: 'omg' },
            { id: 'reaction-3', delay: 6000, text: 'okay hold up 💀' }
        ];

        const messages = [
            'Reading your experience...',
            'Analyzing skills and achievements...',
            'Comparing with industry standards...',
            'Preparing the roast...',
            'Finding matching opportunities...'
        ];

        let messageIndex = 0;
        const messageInterval = setInterval(() => {
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage && messageIndex < messages.length) {
                loadingMessage.textContent = messages[messageIndex];
                messageIndex++;
            } else {
                clearInterval(messageInterval);
            }
        }, 1500);

        reactions.forEach(reaction => {
            setTimeout(() => {
                const element = document.getElementById(reaction.id);
                if (element) {
                    element.classList.remove('hidden');
                    element.classList.add('show');
                }
            }, reaction.delay);
        });
    }

    showDemoResults() {
        const demoResults = {
            category: "entry-level ambitious hopeful",
            score: 42,
            roastText: [
                "> Thank your obsessions with unpaid internships and coffee runs for that.",
                "> Based on your experience, I can also tell you your future is...",
                "> entry-level-for-life legendary bad",
                "> Here's what else is going on in your career trajectory:"
            ],
            overusedSkills: [
                "Microsoft Office by Everyone",
                "Team Player by Generic Corp",
                "Hard Worker by Minimum Wage Inc",
                "Fast Learner by Every Graduate",
                "Detail Oriented by Copy-Paste Masters"
            ],
            missingSkills: [
                "Programming Languages",
                "Industry-Specific Tools",
                "Leadership Experience",
                "Quantifiable Achievements",
                "Professional Certifications"
            ],
            recommendations: [
                "Learn in-demand technical skills for your field",
                "Get professional certifications",
                "Add specific, quantifiable achievements",
                "Remove generic buzzwords and clichés",
                "Include relevant project experience",
                "Highlight unique accomplishments"
            ],
            jobMatches: [
                {
                    title: "Junior Software Developer",
                    company: "StartupCorp Inc.",
                    match: 68,
                    skills: ["JavaScript", "React", "Node.js", "Git"]
                },
                {
                    title: "Marketing Coordinator",
                    company: "Digital Agency LLC",
                    match: 45,
                    skills: ["Social Media", "Content Creation", "Analytics"]
                },
                {
                    title: "Customer Support Specialist",
                    company: "TechSupport Pro",
                    match: 72,
                    skills: ["Communication", "Problem Solving", "CRM"]
                }
            ]
        };

        this.showResults(demoResults);
    }

    showResults(results) {
        this.showPage('results-page');
        
        // Update category
        const categoryElement = document.getElementById('roast-category');
        if (categoryElement) {
            categoryElement.textContent = results.category;
        }

        // Update score
        const scoreElement = document.getElementById('resume-score');
        if (scoreElement) {
            scoreElement.textContent = `${results.score}/100`;
            
            // Color code the score
            if (results.score < 30) {
                scoreElement.style.color = '#e53e3e';
            } else if (results.score < 60) {
                scoreElement.style.color = '#ed8936';
            } else {
                scoreElement.style.color = '#38a169';
            }
        }

        // Update roast text
        const roastTextElement = document.getElementById('roast-text');
        if (roastTextElement && results.roastText) {
            roastTextElement.innerHTML = results.roastText.map(text => `<p>${text}</p>`).join('');
        }

        // Update overused skills
        const overusedElement = document.getElementById('overused-skills');
        if (overusedElement && results.overusedSkills) {
            overusedElement.innerHTML = results.overusedSkills.map(skill => `<li>${skill}</li>`).join('');
        }

        // Update missing skills
        const missingElement = document.getElementById('missing-skills');
        if (missingElement && results.missingSkills) {
            missingElement.innerHTML = results.missingSkills.map(skill => `<li>${skill}</li>`).join('');
        }

        // Update recommendations
        const recommendationsElement = document.getElementById('recommendations');
        if (recommendationsElement && results.recommendations) {
            recommendationsElement.innerHTML = results.recommendations.map(rec => `<li>${rec}</li>`).join('');
        }

        // Update job matches
        const jobMatchesElement = document.getElementById('job-matches');
        if (jobMatchesElement && results.jobMatches) {
            jobMatchesElement.innerHTML = results.jobMatches.map(job => `
                <div class="job-card">
                    <h4>${job.title}</h4>
                    <p class="company">${job.company}</p>
                    <p class="match-score">Match: ${job.match}%</p>
                    <div class="job-skills">
                        ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    </div>
                </div>
            `).join('');
        }
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        this.currentPage = pageId;
    }
}

// Global functions for buttons
function startOver() {
    const app = new ResumeRoaster();
    app.showPage('landing-page');
    
    // Reset upload area
    const uploadArea = document.getElementById('upload-area');
    uploadArea.classList.remove('has-file');
    const fileInfo = uploadArea.querySelector('.file-info');
    if (fileInfo) {
        fileInfo.remove();
    }
    
    // Reset file input
    const fileInput = document.getElementById('resume-upload');
    if (fileInput) {
        fileInput.value = '';
    }
}

async function downloadReport() {
    // Create a detailed report
    const report = generateDetailedReport();
    
    // Create and download PDF-like text file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume-roast-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function generateDetailedReport() {
    const currentDate = new Date().toLocaleDateString();
    
    return `
RESUME ROAST REPORT
Generated on: ${currentDate}

==================================================
OVERALL ASSESSMENT
==================================================

Category: entry-level ambitious hopeful
Score: 42/100

Your resume shows the classic signs of someone who watched too many LinkedIn motivational posts and thought "Microsoft Office" was a personality trait. But don't worry, we've all been there (some of us just stayed there longer).

==================================================
DETAILED ANALYSIS
==================================================

OVERUSED SKILLS (Please stop):
• Microsoft Office by Everyone
• Team Player by Generic Corp  
• Hard Worker by Minimum Wage Inc
• Fast Learner by Every Graduate
• Detail Oriented by Copy-Paste Masters

MISSING SKILLS (You really need these):
• Programming Languages
• Industry-Specific Tools
• Leadership Experience
• Quantifiable Achievements
• Professional Certifications

==================================================
RECOMMENDATIONS FOR IMPROVEMENT
==================================================

1. Learn in-demand technical skills for your field
2. Get professional certifications
3. Add specific, quantifiable achievements
4. Remove generic buzzwords and clichés
5. Include relevant project experience
6. Highlight unique accomplishments

==================================================
JOB OPPORTUNITIES
==================================================

Based on your current skillset, here are some positions you might actually have a chance at:

1. Junior Software Developer at StartupCorp Inc. (68% match)
   Skills needed: JavaScript, React, Node.js, Git

2. Customer Support Specialist at TechSupport Pro (72% match)
   Skills needed: Communication, Problem Solving, CRM

3. Marketing Coordinator at Digital Agency LLC (45% match)
   Skills needed: Social Media, Content Creation, Analytics

==================================================
FINAL THOUGHTS
==================================================

Remember, this roast comes from a place of love (and advanced algorithms). Your resume might be entry-level now, but with the right improvements, you could graduate to "competent human being" status.

Good luck out there! You're going to need it.

---
Generated by Resume Roast AI
Because someone needs to tell you the truth about your career prospects.
`;
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ResumeRoaster();
});
