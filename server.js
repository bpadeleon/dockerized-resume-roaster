const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

// Add this check for built-in fetch
if (!globalThis.fetch) {
    // If no built-in fetch, use axios instead
    globalThis.fetch = async (url, options) => {
        try {
            const response = await axios({
                url,
                method: options.method || 'GET',
                headers: options.headers,
                data: options.body
            });
            
            return {
                ok: response.status >= 200 && response.status < 300,
                status: response.status,
                statusText: response.statusText,
                json: async () => response.data
            };
        } catch (error) {
            return {
                ok: false,
                status: error.response?.status || 500,
                statusText: error.response?.statusText || 'Error'
            };
        }
    };
}

const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|txt|doc|docx)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Resume analysis endpoint
app.post('/api/analyze-resume', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Extract text from the uploaded file
        let resumeText = '';
        
        if (req.file.mimetype === 'application/pdf') {
            const dataBuffer = fs.readFileSync(req.file.path);
            const pdfData = await pdfParse(dataBuffer);
            resumeText = pdfData.text;
        } else if (req.file.mimetype === 'text/plain') {
            resumeText = fs.readFileSync(req.file.path, 'utf8');
        } else {
            // For DOC/DOCX files, we'll need a more sophisticated parser
            // For now, return a demo response
            resumeText = 'Sample resume text for analysis';
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        // Analyze the resume
        const analysis = await analyzeResume(resumeText);

        // Get job matches
        const jobMatches = await getJobMatches(analysis.extractedSkills);

        const results = {
            ...analysis,
            jobMatches
        };

        res.json(results);

    } catch (error) {
        console.error('Analysis error:', error);
        
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            error: 'Failed to analyze resume',
            details: error.message 
        });
    }
});

// Resume analysis function
async function analyzeResume(resumeText) {
    try {
        // Use Hugging Face AI if API key is available, otherwise enhanced rule-based
        if (process.env.HF_API_KEY) {
            console.log('🤖 Using Hugging Face AI with API key...');
            return await analyzeWithAI(resumeText);
        } else {
            console.log('📊 Using enhanced rule-based analysis...');
            return analyzeWithRules(resumeText);
        }
    } catch (error) {
        console.error('AI analysis failed, falling back to rules:', error);
        return analyzeWithRules(resumeText);
    }
}

// AI-powered analysis using Hugging Face
// Resume analysis function
async function analyzeResume(resumeText) {
    try {
        // Always use Hugging Face since API key is available
        console.log('🤖 Using Hugging Face AI with your API key...');
        return await analyzeWithAI(resumeText);
    } catch (error) {
        console.error('Hugging Face analysis failed, falling back to rules:', error.message);
        return analyzeWithRules(resumeText);
    }
}

// Enhanced Hugging Face AI analysis using your API key
async function analyzeWithAI(resumeText) {
    console.log('🔑 Using HF API Key:', process.env.HF_API_KEY ? 'Found' : 'Missing');
    
    // Use models that actually have free inference endpoints
    const models = [
        'cardiffnlp/twitter-roberta-base-sentiment-latest',
        'facebook/bart-large-cnn',
        'distilbert-base-uncased-finetuned-sst-2-english'
    ];
    
    for (const model of models) {
        try {
            console.log(`🤖 Trying model: ${model}`);
            
            const HF_API_URL = `https://api-inference.huggingface.co/models/${model}`;
            
            // Create analysis prompt based on model type
            let payload;
            if (model.includes('sentiment')) {
                payload = { inputs: resumeText.substring(0, 500) };
            } else if (model.includes('bart')) {
                payload = { 
                    inputs: resumeText.substring(0, 1000),
                    parameters: { max_length: 100, min_length: 20 }
                };
            } else {
                payload = { inputs: resumeText.substring(0, 500) };
            }
            
            const response = await fetch(HF_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.HF_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.log(`❌ Model ${model} failed: ${response.status} ${response.statusText}`);
                continue;
            }

            const result = await response.json();
            console.log('✅ AI Response received:', result);
            
            // Generate roast based on AI analysis
            let aiRoast = generateAIBasedRoast(result, model);
            
            // Combine with rule-based analysis
            const ruleBasedAnalysis = analyzeWithRules(resumeText);
            
            const roastText = [
                '> ' + aiRoast,
                '> Based on your experience, I can also tell you your future is...',
                `> ${ruleBasedAnalysis.category} ${ruleBasedAnalysis.score < 50 ? 'bad' : 'questionable'}`,
                "> Here's what else is going on in your career trajectory:"
            ];
            
            console.log('🎉 AI analysis successful!');
            return {
                ...ruleBasedAnalysis,
                roastText
            };

        } catch (modelError) {
            console.log(`❌ Model ${model} error:`, modelError.message);
            continue;
        }
    }
    
    // If all models fail, throw error to trigger fallback
    throw new Error('All Hugging Face models failed');
}

// Generate roast based on AI model results
// Generate roast based on AI model results
function generateAIBasedRoast(result, modelType) {
    if (modelType.includes('sentiment')) {
        // Sentiment analysis result
        if (result && result[0]) {
            const sentiment = result[0].label;
            const confidence = result[0].score;
            
            if (sentiment === 'NEGATIVE' && confidence > 0.7) {
                return "Even AI thinks your resume sounds depressing - that's a new low";
            } else if (sentiment === 'POSITIVE' && confidence > 0.8) {
                return "Your resume is so optimistic, it's like you've never actually worked anywhere";
            } else {
                return "AI analyzed your resume and got confused - apparently your career path is as unclear to machines as it is to humans";
            }
        }
    } else if (modelType.includes('bart')) {
        // Summarization result - BUT CREATE ROASTS INSTEAD OF SHOWING SUMMARY
        if (result && result[0] && result[0].summary_text) {
            const summary = result[0].summary_text.toLowerCase();
            
            // Create roasts based on what the AI summary contains
            if (summary.includes('intern') || summary.includes('entry')) {
                return "AI tried to summarize your resume but gave up and just called you an intern";
            } else if (summary.includes('student') || summary.includes('graduate')) {
                return "Your resume screams 'fresh graduate with zero real experience' so loudly that even AI heard it";
            } else if (summary.includes('experience') && summary.includes('work')) {
                return "AI processed your work experience and concluded you've mastered the art of existing in offices";
            } else if (summary.includes('skill') || summary.includes('technology')) {
                return "Your technical skills impressed AI about as much as a Windows 95 computer impresses a gamer";
            } else if (summary.includes('manage') || summary.includes('lead')) {
                return "AI detected leadership potential, which is code for 'desperately trying to sound important'";
            } else if (summary.includes('develop') || summary.includes('create')) {
                return "Your development experience suggests you've successfully turned coffee into code (probably buggy code)";
            } else {
                return "AI tried to understand your career path but ended up more confused than a GPS in a tunnel";
            }
        } else {
            return "AI attempted to analyze your resume but crashed - apparently your career is too chaotic for artificial intelligence";
        }
    }
    
    // Default roasts for other cases
    const defaultRoasts = [
        "Your resume shows the confidence of someone who hasn't read many job requirements",
        "AI processed your resume and immediately requested hazard pay",
        "Your career trajectory suggests you're playing career roulette",
        "Even artificial intelligence is confused by your employment history",
        "Your resume reads like a cautionary tale about career planning"
    ];
    
    return defaultRoasts[Math.floor(Math.random() * defaultRoasts.length)];
}

// Generate contextual roast based on resume content
function generateContextualRoast(resumeText, analysis) {
    const text = resumeText.toLowerCase();
    
    // Detect specific issues for targeted roasting
    const issues = [];
    
    if (text.includes('unpaid') || text.includes('volunteer')) {
        issues.push("Your collection of unpaid work experience shows real dedication to being undervalued");
    }
    
    if (text.includes('seeking opportunities') || text.includes('dynamic environment')) {
        issues.push("Your career objective is so generic, it could belong to literally anyone with a pulse");
    }
    
    if (analysis.extractedSkills.includes('microsoft office')) {
        issues.push("Listing Microsoft Office as a skill is like bragging about knowing how to use a doorknob");
    }
    
    if (!/\d+%|\d+\+|\$\d+|increased|improved|reduced|achieved/.test(text)) {
        issues.push("Zero quantifiable achievements detected - I see you prefer the 'trust me, I'm great' approach to proving your worth");
    }
    
    if (analysis.score < 40) {
        issues.push("Your resume reads like a cautionary tale about career planning");
    } else if (analysis.score < 60) {
        issues.push("Your resume shows promise, much like a participation trophy shows effort");
    }
    
    // Default roasts if no specific issues found
    if (issues.length === 0) {
        issues.push("Your resume demonstrates the confidence of someone who hasn't read many job requirements");
    }
    
    return issues[Math.floor(Math.random() * issues.length)];
}

// Rule-based analysis (enhanced with humor)
function analyzeWithRules(resumeText) {
    const text = resumeText.toLowerCase();
    
    // Expanded skill detection
    const skillKeywords = [
        'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'html', 'css', 'typescript',
        'aws', 'docker', 'kubernetes', 'git', 'mongodb', 'postgresql', 'redis',
        'project management', 'leadership', 'communication', 'teamwork', 'problem solving',
        'microsoft office', 'excel', 'powerpoint', 'word', 'photoshop', 'illustrator',
        'agile', 'scrum', 'jira', 'slack', 'figma', 'sketch'
    ];
    
    const extractedSkills = skillKeywords.filter(skill => text.includes(skill));
    
    // Calculate score with more nuanced factors
    let score = 35; // Slightly higher base score
    
    // Technical skills bonus (more generous)
    const technicalSkills = ['javascript', 'python', 'java', 'react', 'node.js', 'sql', 'typescript', 'aws', 'docker'];
    const techSkillCount = technicalSkills.filter(skill => text.includes(skill)).length;
    score += techSkillCount * 8; // Reduced from 10 to balance better
    
    // Modern tech stack bonus
    const modernSkills = ['react', 'node.js', 'aws', 'docker', 'typescript', 'kubernetes'];
    const modernSkillCount = modernSkills.filter(skill => text.includes(skill)).length;
    score += modernSkillCount * 5;
    
    // Quantifiable achievements (big bonus)
    const hasNumbers = /\d+%|\d+\+|\$\d+|increased|improved|reduced|achieved|generated|saved|managed \d+/i.test(text);
    if (hasNumbers) score += 15;
    
    // Leadership indicators
    const hasLeadership = /led|managed|supervised|coordinated|directed|mentored/i.test(text);
    if (hasLeadership) score += 10;
    
    // Education bonus
    const hasEducation = /bachelor|master|phd|degree|university|college/i.test(text);
    if (hasEducation) score += 5;
    
    // Penalties for overused phrases (harsh but fair)
    const overusedPhrases = [
        'team player', 'hard worker', 'fast learner', 'detail oriented', 'self-motivated',
        'passionate', 'results-driven', 'dynamic', 'synergy', 'leverage', 'utilize'
    ];
    const overusedCount = overusedPhrases.filter(phrase => text.includes(phrase)).length;
    score -= overusedCount * 3; // Reduced penalty
    
    // Penalty for obvious padding
    const paddingPhrases = ['responsible for', 'duties included', 'worked on'];
    const paddingCount = paddingPhrases.filter(phrase => text.includes(phrase)).length;
    score -= paddingCount * 2;
    
    // Cap the score
    score = Math.max(15, Math.min(95, score)); // Better range
    
    // More nuanced categorization
    let category = "entry-level ambitious hopeful";
    if (score >= 80) category = "actually competent human being";
    else if (score >= 65) category = "promising professional with potential";
    else if (score >= 50) category = "decent candidate who needs polish";
    else if (score >= 35) category = "entry-level with room for growth";
    else category = "resume emergency intervention needed";
    
    // Enhanced overused skills detection with specific roasts
    const foundOverusedPhrases = overusedPhrases.filter(phrase => text.includes(phrase));
    const overusedSkills = [
        ...foundOverusedPhrases.map(phrase => {
            const roastMap = {
                'team player': '"Team Player" - Translation: I do what others tell me',
                'hard worker': '"Hard Worker" - As opposed to all those lazy worker applicants',
                'fast learner': '"Fast Learner" - Because slow learners don\'t get hired',
                'detail oriented': '"Detail Oriented" - Yet somehow missed spell-checking this resume',
                'self-motivated': '"Self-Motivated" - Unlike those externally-motivated robots',
                'passionate': '"Passionate" - About what? Existing?',
                'results-driven': '"Results-Driven" - As opposed to failure-driven?',
                'dynamic': '"Dynamic" - Meaningless corporate buzzword #47',
                'synergy': '"Synergy" - Corporate buzzword that makes everyone cringe',
                'leverage': '"Leverage" - Using fancy words for basic concepts',
                'utilize': '"Utilize" - Just say "use" like a normal person'
            };
            return roastMap[phrase] || `"${phrase}" by Everyone Ever`;
        }),
        ...(text.includes('microsoft office') ? ['Microsoft Office - Congratulations on mastering 1995 technology'] : []),
        ...(text.includes('communication') && !hasLeadership ? ['Basic Communication - A skill humans developed 50,000 years ago'] : [])
    ];
    
    // Smarter missing skills detection with roasting context
    const missingSkills = [];
    if (techSkillCount === 0) missingSkills.push('Any Technical Skills Whatsoever - The year is 2025, learn to code');
    if (!hasNumbers) missingSkills.push('Quantifiable Achievements - Numbers prove you actually did something');
    if (!hasLeadership) missingSkills.push('Leadership Experience - Even leading a group project counts');
    if (!text.includes('certification') && !text.includes('certified')) missingSkills.push('Professional Certifications - Show you care about your career');
    if (!text.includes('project') && !text.includes('portfolio')) missingSkills.push('Actual Project Experience - Theory is nice, practice is better');
    if (modernSkillCount === 0) missingSkills.push('Modern Tech Stack Knowledge - It\'s not 2010 anymore');
    if (!text.includes('github') && !text.includes('portfolio') && techSkillCount > 0) missingSkills.push('Portfolio/GitHub Link - Prove your skills exist');
    
    // Better recommendations based on analysis with motivational roasting
    const recommendations = [];
    if (techSkillCount < 3) recommendations.push('Learn in-demand technical skills (seriously, AI won\'t replace programmers who actually know programming)');
    if (!hasNumbers) recommendations.push('Add specific, quantifiable achievements (saying "increased efficiency" without numbers is meaningless)');
    if (overusedCount > 2) recommendations.push('Remove generic buzzwords and replace with actual accomplishments (buzzwords fool no one)');
    if (!hasLeadership) recommendations.push('Highlight any leadership or mentoring experience (even training the new intern counts)');
    if (!text.includes('certification')) recommendations.push('Get professional certifications in your field (show you\'re serious about growth)');
    if (!text.includes('project') && !text.includes('portfolio')) recommendations.push('Include relevant project experience or portfolio links (talk is cheap, show your work)');
    recommendations.push('Proofread for typos and generic phrases (attention to detail starts with your resume)');
    
    return {
        category,
        score,
        roastText: [], // Will be filled by analyzeWithAI
        overusedSkills: overusedSkills.slice(0, 5), // Limit to 5
        missingSkills: missingSkills.slice(0, 6), // Limit to 6
        recommendations: recommendations.slice(0, 6), // Limit to 6
        extractedSkills
    };
}

// Job matching function
async function getJobMatches(skills) {
    // In a real application, you would integrate with job board APIs
    // For now, we'll return mock data based on skills
    
    const jobDatabase = [
        {
            title: "Junior Software Developer",
            company: "TechStart Inc.",
            skills: ["javascript", "react", "node.js", "git"],
            requiredSkills: 3
        },
        {
            title: "Frontend Developer",
            company: "WebCorp LLC",
            skills: ["html", "css", "javascript", "react"],
            requiredSkills: 3
        },
        {
            title: "Data Analyst",
            company: "DataPro Solutions",
            skills: ["python", "sql", "excel", "tableau"],
            requiredSkills: 2
        },
        {
            title: "Project Coordinator",
            company: "ManageCorp",
            skills: ["project management", "communication", "leadership"],
            requiredSkills: 2
        },
        {
            title: "Customer Support Specialist",
            company: "SupportPro",
            skills: ["communication", "problem solving", "microsoft office"],
            requiredSkills: 2
        },
        {
            title: "Marketing Assistant",
            company: "AdAgency Plus",
            skills: ["social media", "content creation", "analytics", "photoshop"],
            requiredSkills: 2
        }
    ];
    
    const userSkills = skills.map(skill => skill.toLowerCase());
    
    const matches = jobDatabase.map(job => {
        const matchingSkills = job.skills.filter(skill => 
            userSkills.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
        );
        
        const matchPercentage = Math.round((matchingSkills.length / job.skills.length) * 100);
        
        return {
            title: job.title,
            company: job.company,
            match: matchPercentage,
            skills: job.skills.map(skill => skill.charAt(0).toUpperCase() + skill.slice(1))
        };
    })
    .filter(job => job.match > 30) // Only show jobs with >30% match
    .sort((a, b) => b.match - a.match) // Sort by match percentage
    .slice(0, 5); // Limit to top 5 matches
    
    return matches;
}

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
    }
    
    res.status(500).json({ error: 'Server error', details: error.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🔥 Resume Roast server running on http://localhost:${PORT}`);
    console.log('📁 Upload directory:', path.join(__dirname, 'uploads'));
    
    // Test Hugging Face API key if available
    if (process.env.HF_API_KEY) {
        console.log('🤖 Hugging Face API key detected - AI analysis enabled!');
        console.log('🔑 API Key:', process.env.HF_API_KEY.substring(0, 10) + '...');
    } else {
        console.log('📊 No AI API keys - using enhanced rule-based analysis');
    }
    
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }
});

module.exports = app;
