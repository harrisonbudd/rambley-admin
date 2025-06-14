import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  HelpCircle,
  Plus, 
  Edit, 
  Trash2,
  Bot,
  User,
  AlertCircle,
  TrendingUp,
  Save,
  X,
  Search
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { cn } from '../lib/utils'

const faqs = [
  { 
    id: 1, 
    question: 'What time is check-in?', 
    answer: 'Check-in times vary by property. Please check your booking confirmation for specific times.',
    answerType: 'llm', // 'llm', 'host', 'unanswered'
    askCount: 247,
    lastAsked: '2024-01-16 10:30 AM',
    confidence: 95
  },
  { 
    id: 2, 
    question: 'Where can I park?', 
    answer: 'Parking information is provided in your check-in instructions, which vary by property.',
    answerType: 'llm',
    askCount: 189,
    lastAsked: '2024-01-16 9:45 AM',
    confidence: 88
  },
  { 
    id: 3, 
    question: 'What is the WiFi password?', 
    answer: 'WiFi credentials are provided in your welcome message and check-in instructions.',
    answerType: 'host',
    askCount: 156,
    lastAsked: '2024-01-16 11:15 AM',
    confidence: null
  },
  { 
    id: 4, 
    question: 'How do I access the pool area?', 
    answer: '',
    answerType: 'unanswered',
    askCount: 23,
    lastAsked: '2024-01-16 8:30 AM',
    confidence: null
  },
  { 
    id: 5, 
    question: 'What are the quiet hours?', 
    answer: 'Quiet hours are typically from 10 PM to 8 AM, but please check your property-specific house rules as this may vary.',
    answerType: 'host',
    askCount: 67,
    lastAsked: '2024-01-15 11:45 PM',
    confidence: null
  },
  { 
    id: 6, 
    question: 'Can I bring pets?', 
    answer: '',
    answerType: 'unanswered',
    askCount: 45,
    lastAsked: '2024-01-16 7:20 AM',
    confidence: null
  }
]

export default function FAQsPage() {
  const [editingFaq, setEditingFaq] = useState(null)
  const [answerDraft, setAnswerDraft] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const handleStartAnswering = (faq) => {
    setEditingFaq(faq.id)
    setAnswerDraft(faq.answer || '')
  }

  const handleSaveAnswer = (faqId) => {
    // Here you would save the answer to the backend
    console.log('Saving answer for FAQ', faqId, answerDraft)
    setEditingFaq(null)
    setAnswerDraft('')
  }

  const handleCancelAnswering = () => {
    setEditingFaq(null)
    setAnswerDraft('')
  }

  const getAnswerTypeInfo = (answerType) => {
    switch (answerType) {
      case 'llm':
        return {
          icon: Bot,
          label: 'AI Generated',
          color: 'bg-blue-100 text-blue-700',
          description: 'Answered automatically using available context'
        }
      case 'host':
        return {
          icon: User,
          label: 'Host Answered',
          color: 'bg-green-100 text-green-700',
          description: 'Answered by property host'
        }
      case 'unanswered':
        return {
          icon: AlertCircle,
          label: 'Needs Answer',
          color: 'bg-red-100 text-red-700',
          description: 'Requires host input'
        }
      default:
        return {
          icon: HelpCircle,
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-700',
          description: 'Unknown status'
        }
    }
  }

  const filteredFaqs = faqs.filter(faq => {
    // Answer type filter
    const typeMatch = selectedFilter === 'all' || faq.answerType === selectedFilter
    
    // Search filter
    const searchMatch = !searchTerm.trim() || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (faq.answer && faq.answer.toLowerCase().includes(searchTerm.toLowerCase()))

    return typeMatch && searchMatch
  })

  const getFaqCounts = () => {
    return {
      all: faqs.length,
      llm: faqs.filter(f => f.answerType === 'llm').length,
      host: faqs.filter(f => f.answerType === 'host').length,
      unanswered: faqs.filter(f => f.answerType === 'unanswered').length,
    }
  }

  const counts = getFaqCounts()
  const sortedFaqs = [...filteredFaqs].sort((a, b) => b.askCount - a.askCount)

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Frequently Asked Questions</h1>
            <p className="text-brand-mid-gray">Manage common questions and improve guest experience</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add FAQ
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Answer Type Filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All FAQs', count: counts.all },
              { key: 'llm', label: 'AI Generated', count: counts.llm },
              { key: 'host', label: 'Host Answered', count: counts.host },
              { key: 'unanswered', label: 'Need Answers', count: counts.unanswered }
            ].map((filterOption) => (
              <Button
                key={filterOption.key}
                variant={selectedFilter === filterOption.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter(filterOption.key)}
                className="capitalize"
              >
                {filterOption.label}
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "ml-2 text-xs pointer-events-none",
                    selectedFilter === filterOption.key 
                      ? "bg-white/20 text-white" 
                      : "bg-brand-mid-gray/10 text-brand-mid-gray"
                  )}
                >
                  {filterOption.count}
                </Badge>
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="h-4 w-4 text-brand-mid-gray" />
            <Input 
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* FAQs List */}
        <div className="space-y-4">
          {sortedFaqs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <HelpCircle className="mx-auto h-12 w-12 text-brand-mid-gray mb-4" />
                <h3 className="text-lg font-medium text-brand-dark mb-2">No FAQs found</h3>
                <p className="text-brand-mid-gray">
                  {searchTerm ? `No results for "${searchTerm}"` : 'Add your first FAQ to help guests get quick answers.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-brand-dark">
                  {selectedFilter === 'all' ? 'Questions by Popularity' : `${
                    selectedFilter === 'llm' ? 'AI Generated' :
                    selectedFilter === 'host' ? 'Host Answered' :
                    'Questions Needing Answers'
                  } (${sortedFaqs.length})`}
                </h3>
                <div className="flex items-center gap-2 text-sm text-brand-mid-gray">
                  <TrendingUp className="h-4 w-4" />
                  Sorted by ask frequency
                </div>
              </div>
              
              <div className="grid gap-4">
                {sortedFaqs.map((faq, index) => {
                  const typeInfo = getAnswerTypeInfo(faq.answerType)
                  const Icon = typeInfo.icon
                  const isEditing = editingFaq === faq.id
                  
                  return (
                    <Card key={faq.id} className={`${
                      faq.answerType === 'unanswered' ? 'border-red-200 bg-red-50/30' : ''
                    }`}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* FAQ Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex items-center justify-center w-6 h-6 bg-brand-mid-gray/10 rounded-full text-xs font-medium text-brand-mid-gray">
                                {index + 1}
                              </div>
                              
                              <div className="flex-1">
                                <h4 className="font-semibold text-brand-dark mb-2">{faq.question}</h4>
                                
                                <div className="flex items-center gap-3 mb-3">
                                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                    <Icon className="h-3 w-3" />
                                    {typeInfo.label}
                                  </div>
                                  
                                  <div className="flex items-center gap-1 text-sm text-brand-mid-gray">
                                    <TrendingUp className="h-3 w-3" />
                                    Asked {faq.askCount} times
                                  </div>
                                  
                                  {faq.confidence && (
                                    <Badge variant="outline" className="text-xs">
                                      {faq.confidence}% confidence
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-xs text-brand-mid-gray mb-3">
                                  Last asked: {faq.lastAsked}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Answer Section */}
                          <div className="pl-9">
                            {faq.answerType === 'unanswered' ? (
                              // Unanswered - Show input or current answer
                              <div className="space-y-3">
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-sm text-red-800 font-medium mb-1">
                                    This question needs an answer
                                  </p>
                                  <p className="text-xs text-red-600">
                                    Guests have asked this {faq.askCount} times but no answer is available.
                                  </p>
                                </div>
                                
                                {isEditing ? (
                                  <div className="space-y-3">
                                    <div>
                                      <Label htmlFor={`answer-${faq.id}`}>Your Answer</Label>
                                      <textarea
                                        id={`answer-${faq.id}`}
                                        value={answerDraft}
                                        onChange={(e) => setAnswerDraft(e.target.value)}
                                        className="w-full h-24 px-3 py-2 border border-input rounded-md text-sm mt-1"
                                        placeholder="Type your answer here..."
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleSaveAnswer(faq.id)}>
                                        <Save className="h-4 w-4 mr-1" />
                                        Save Answer
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={handleCancelAnswering}>
                                        <X className="h-4 w-4 mr-1" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleStartAnswering(faq)}
                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                  >
                                    Provide Answer
                                  </Button>
                                )}
                              </div>
                            ) : (
                              // Answered - Show current answer
                              <div className="space-y-2">
                                <div className="p-3 bg-gray-50 border rounded-lg">
                                  <p className="text-sm text-brand-dark">{faq.answer}</p>
                                </div>
                                <p className="text-xs text-brand-mid-gray">
                                  {typeInfo.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
} 