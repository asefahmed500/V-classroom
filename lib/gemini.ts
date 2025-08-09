import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Multi-agent system for different tutoring roles
export const tutorAgents = {
  // General Study Assistant
  studyAssistant: genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `You are a helpful study assistant for high school students. 
    - Provide clear, concise explanations
    - Break down complex topics into simple steps
    - Encourage active learning
    - Ask follow-up questions to check understanding
    - Adapt your language to high school level`
  }),

  // Math Tutor
  mathTutor: genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `You are a specialized mathematics tutor for high school students.
    - Solve problems step-by-step
    - Explain mathematical concepts clearly
    - Provide practice problems
    - Help with algebra, geometry, calculus, statistics
    - Use visual descriptions when helpful`
  }),

  // Science Tutor
  scienceTutor: genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `You are a science tutor specializing in physics, chemistry, and biology.
    - Explain scientific concepts with real-world examples
    - Help with lab reports and experiments
    - Break down complex processes
    - Connect different scientific disciplines
    - Encourage scientific thinking`
  }),

  // Writing Coach
  writingCoach: genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `You are a writing coach for high school students.
    - Help improve essay structure and flow
    - Provide feedback on grammar and style
    - Suggest better word choices
    - Help with research and citations
    - Encourage creative expression`
  }),

  // Exam Prep Specialist
  examPrep: genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `You are an exam preparation specialist.
    - Create practice questions and quizzes
    - Help develop study schedules
    - Provide test-taking strategies
    - Review key concepts before exams
    - Build confidence and reduce anxiety`
  })
}

export async function generateResponse(
  agent: keyof typeof tutorAgents,
  prompt: string,
  context?: string
) {
  try {
    const model = tutorAgents[agent]
    const fullPrompt = context 
      ? `Context: ${context}\n\nStudent Question: ${prompt}`
      : prompt

    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error('Failed to generate AI response')
  }
}

export async function generateQuizQuestions(subject: string, topic: string, count: number = 5) {
  try {
    const prompt = `Generate ${count} multiple choice questions about ${topic} in ${subject} for high school students. 
    Format as JSON array with structure: 
    [{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}]`
    
    const result = await tutorAgents.examPrep.generateContent(prompt)
    const response = await result.response
    return JSON.parse(response.text())
  } catch (error) {
    console.error('Quiz generation error:', error)
    throw new Error('Failed to generate quiz questions')
  }
}

export async function analyzeStudyNotes(notes: string) {
  try {
    const prompt = `Analyze these study notes and provide:
    1. Key concepts summary
    2. Potential gaps or missing information
    3. Suggested practice questions
    4. Study tips for better retention
    
    Notes: ${notes}`
    
    const result = await tutorAgents.studyAssistant.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Notes analysis error:', error)
    throw new Error('Failed to analyze notes')
  }
}