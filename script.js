// File Upload Functionality
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadedFileDiv = document.getElementById('uploadedFile');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFile');
const analyzeBtn = document.getElementById('analyzeBtn');

let uploadedFile = null;

// Click to upload
uploadArea.addEventListener('click', (e) => {
    // Don't open file picker if clicking on uploaded file div or its children
    if (uploadedFileDiv.style.display === 'flex' || 
        e.target.closest('#uploadedFile') ||
        e.target.closest('.btn-remove') ||
        e.target.closest('.btn-upload')) {
        return;
    }
    fileInput.click();
});

// File input change
fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

// Handle file
function handleFile(file) {
    if (!file) return;
    
    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
        alert('Please upload a PDF, DOC, or DOCX file');
        return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size should not exceed 5MB');
        return;
    }
    
    uploadedFile = file;
    
    // Display file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    // Show uploaded file div, hide upload area content
    document.querySelector('.upload-content').style.display = 'none';
    uploadedFileDiv.style.display = 'flex';
}

// Remove file
removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    uploadedFile = null;
    fileInput.value = '';
    
    document.querySelector('.upload-content').style.display = 'block';
    uploadedFileDiv.style.display = 'none';
});

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Analyze button
analyzeBtn.addEventListener('click', async () => {
    if (!uploadedFile) {
        alert('Please upload a resume first');
        return;
    }
    
    const jobDescription = document.getElementById('jobDesc').value;
    if (!jobDescription.trim()) {
        alert('Please provide a job description');
        return;
    }
    
    // Show loading state
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    analyzeBtn.disabled = true;
    
    try {
        // Create FormData
        const formData = new FormData();
        formData.append('resume', uploadedFile);
        formData.append('job_description', jobDescription);
        
        // Call Flask API
        const response = await fetch('http://127.0.0.1:8080/analyze', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Analysis failed');
        }
        
        const result = await response.json();
        console.log('Analysis result:', result);
        
        // Show success
        analyzeBtn.innerHTML = '<i class="fas fa-check"></i> Analysis Complete!';
        
        // Display results
        setTimeout(() => {
            displayResults(result);
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Resume';
            analyzeBtn.disabled = false;
        }, 1000);
        
    } catch (error) {
        console.error('Error details:', error);
        alert('Error: ' + error.message + '\\nCheck the browser console for more details.');
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Resume';
        analyzeBtn.disabled = false;
    }
});

// Display results function
function displayResults(result) {
    const atsText = result.ats_result;
    
    console.log('ATS Text:', atsText); // Debug log
    
    // Extract match percentage - try multiple patterns
    let matchPercentage = 0;
    
    // Pattern 1: ### 1. Match Percentage: **56%**
    let matchRegex = /###\s*1\.\s*Match Percentage:\s*\*\*(\d+)%?\*\*/i;
    let matchResult = atsText.match(matchRegex);
    
    if (matchResult) {
        matchPercentage = parseInt(matchResult[1]);
        console.log('Match found with pattern 1:', matchPercentage);
    } else {
        // Pattern 2: Match Percentage: **56%**
        matchRegex = /Match Percentage:\s*\*\*(\d+)%?\*\*/i;
        matchResult = atsText.match(matchRegex);
        if (matchResult) {
            matchPercentage = parseInt(matchResult[1]);
            console.log('Match found with pattern 2:', matchPercentage);
        } else {
            // Pattern 3: Match Percentage: 56%
            matchRegex = /Match Percentage:\s*(\d+)%?/i;
            matchResult = atsText.match(matchRegex);
            if (matchResult) {
                matchPercentage = parseInt(matchResult[1]);
                console.log('Match found with pattern 3:', matchPercentage);
            } else {
                // Pattern 4: Just find first percentage number after "match"
                matchRegex = /match.*?(\d+)%/i;
                matchResult = atsText.match(matchRegex);
                if (matchResult) {
                    matchPercentage = parseInt(matchResult[1]);
                    console.log('Match found with pattern 4:', matchPercentage);
                }
            }
        }
    }
    
    console.log('Final match percentage:', matchPercentage); // Debug log
    
    // Create results modal
    const modal = document.createElement('div');
    modal.className = 'results-modal';
    modal.innerHTML = `
        <div class="results-content">
            <button class="close-modal" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            
            <div class="results-header">
                <h2><i class="fas fa-chart-line"></i> ATS Analysis Results</h2>
                <p>Your resume compatibility score</p>
            </div>
            
            <div class="score-container">
                <div class="score-circle">
                    <svg width="200" height="200" viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="90" fill="none" stroke="#e2e8f0" stroke-width="12"/>
                        <circle cx="100" cy="100" r="90" fill="none" stroke="url(#gradient)" stroke-width="12"
                                stroke-dasharray="${matchPercentage * 5.65} 565"
                                stroke-linecap="round"
                                transform="rotate(-90 100 100)"/>
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div class="score-text">
                        <span class="score-number">${matchPercentage}</span>
                        <span class="score-label">ATS Score</span>
                    </div>
                </div>
                <div class="score-status ${getScoreClass(matchPercentage)}">
                    <i class="fas ${getScoreIcon(matchPercentage)}"></i>
                    <span>${getScoreLabel(matchPercentage)}</span>
                </div>
            </div>
            
            <div class="analysis-content">
                <div class="result-text">${formatAnalysis(atsText)}</div>
            </div>
            
            <div class="action-buttons">
                <button class="btn-download" onclick="downloadResults()">
                    <i class="fas fa-download"></i> Download Report
                </button>
                <button class="btn-close" onclick="this.closest('.results-modal').remove()">
                    <i class="fas fa-check"></i> Done
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate in
    setTimeout(() => modal.classList.add('show'), 10);
}

// Get score class for styling
function getScoreClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
}

// Get score icon
function getScoreIcon(score) {
    if (score >= 80) return 'fa-star';
    if (score >= 60) return 'fa-thumbs-up';
    if (score >= 40) return 'fa-exclamation-circle';
    return 'fa-times-circle';
}

// Get score label
function getScoreLabel(score) {
    if (score >= 80) return 'Excellent Match!';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Needs Improvement';
}

// Format analysis text with proper sections and boxes
function formatAnalysis(text) {
    // Split the text into sections
    const sections = [];
    
    // Extract Match Percentage
    const matchSection = text.match(/###\s*1\.\s*Match Percentage:.*?(\d+)%.*?(?=###|$)/s);
    if (matchSection) {
        sections.push({
            title: '📊 Match Percentage',
            content: matchSection[1] + '%',
            type: 'highlight'
        });
    }
    
    // Extract Matching Skills
    const matchingSkillsSection = text.match(/###\s*2\.\s*Matching Skills:(.*?)(?=###|$)/s);
    if (matchingSkillsSection) {
        sections.push({
            title: '✅ Matching Skills',
            content: formatListItems(matchingSkillsSection[1]),
            type: 'success'
        });
    }
    
    // Extract Missing Skills
    const missingSkillsSection = text.match(/###\s*3\.\s*Missing Skills:(.*?)(?=###|$)/s);
    if (missingSkillsSection) {
        sections.push({
            title: '❌ Missing Skills',
            content: formatListItems(missingSkillsSection[1]),
            type: 'warning'
        });
    }
    
    // Extract Strengths
    const strengthsSection = text.match(/###\s*4\.\s*Strengths:(.*?)(?=###|$)/s);
    if (strengthsSection) {
        sections.push({
            title: '💪 Strengths',
            content: formatListItems(strengthsSection[1]),
            type: 'info'
        });
    }
    
    // Extract Improvement Suggestions
    const suggestionsSection = text.match(/###\s*5\.\s*Improvement Suggestions:(.*?)(?=###|$)/s);
    if (suggestionsSection) {
        sections.push({
            title: '💡 Improvement Suggestions',
            content: formatListItems(suggestionsSection[1]),
            type: 'primary'
        });
    }
    
    // Generate HTML
    let html = '';
    sections.forEach(section => {
        html += `
            <div class="result-section ${section.type}">
                <h3 class="section-title">${section.title}</h3>
                <div class="section-content">${section.content}</div>
            </div>
        `;
    });
    
    return html;
}

// Helper function to format list items
function formatListItems(text) {
    // Remove multiple newlines and clean up
    let cleaned = text.trim()
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\n/g, '<li>$1</li>\n');
    
    // Check if we have bullet points
    if (cleaned.includes('<li>')) {
        return '<ul>' + cleaned + '</ul>';
    }
    
    // Otherwise, split by newlines and create list
    const lines = cleaned.split('\n').filter(line => line.trim());
    if (lines.length > 1) {
        return '<ul>' + lines.map(line => `<li>${line.trim()}</li>`).join('') + '</ul>';
    }
    
    return '<p>' + cleaned + '</p>';
}

// Download results (placeholder)
function downloadResults() {
    alert('Download feature coming soon! Your results will be saved as a PDF.');
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements
document.querySelectorAll('.feature-card, .step').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.6s ease-out';
    observer.observe(el);
});
