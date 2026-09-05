'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { Button } from '@/components/ui/8bit/button'
import { MessageSquare, Send, Bot, User, Globe } from 'lucide-react'

interface Message {
  id: string
  sender: 'guest' | 'concierge'
  text: string
  intent?: string
  sentiment?: string
  time: string
  language?: string
}

export default function ConciergePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'guest',
      text: 'Namaste, can we arrange a boat taxi to Mandwa jetty tomorrow morning around 9 AM?',
      intent: 'transport',
      time: '14:20',
    },
    {
      id: '2',
      sender: 'concierge',
      text: 'Namaste Mr. Singhania! Absolutely. I have booked our private resort speedboat departing from the private pier at 08:45 AM to connect seamlessly with the 09:15 AM M2M Ro-Pax ferry to Mumbai. Our chauffeur will meet you at Villa 102 at 08:35 AM.',
      time: '14:20',
    },
    {
      id: '3',
      sender: 'guest',
      text: 'Also the AC in the master bedroom seems to make a slight whistling sound.',
      intent: 'report_issue',
      time: '14:24',
    },
    {
      id: '4',
      sender: 'concierge',
      text: 'I apologize for the disturbance. I have auto-dispatched Senior HVAC Tech Ganesh Kulkarni (Workorder #WO-402) to inspect the damper within 15 minutes. May I send fresh coconut water to your terrace in the meantime?',
      time: '14:25',
    },
  ])

  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return

    const newGuestMsg: Message = {
      id: Date.now().toString(),
      sender: 'guest',
      text: input,
      intent: 'guest_inquiry',
      time: 'Just now',
    }

    setMessages((prev) => [...prev, newGuestMsg])
    setInput('')

    setTimeout(() => {
      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'concierge',
        text: `Understood! Our AI Concierge has classified your request and alerted the zone supervisor. Dispatched!`,
        time: 'Just now',
      }
      setMessages((prev) => [...prev, aiReply])
    }, 600)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-4 bg-[#0a1014] border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 bg-[#00ff66] inline-block shadow-[1px_1px_0px_#000]" />
            <h1 className="font-pixel text-sm sm:text-base text-white tracking-wider uppercase">
              AI CONCIERGE & OMNICHANNEL DISPATCH
            </h1>
          </div>
          <p className="font-mono-data text-xs text-slate-400">
            Real-time multi-lingual intent parsing (English, Hindi, Marathi) with instant department dispatch.
          </p>
        </div>

        <Badge variant="cyan">MULTILINGUAL BOT</Badge>
      </div>

      {/* Chat Box */}
      <Card titleBar="GUEST COMMUNICATIONS CONSOLE" variant="cyan" className="p-0">
        <div className="p-4 flex flex-col h-[500px]">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((m) => {
              const isGuest = m.sender === 'guest'

              return (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[85%] ${isGuest ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div
                    className={`w-7 h-7 border-2 border-black flex items-center justify-center shrink-0 ${
                      isGuest ? 'bg-[#b5179e] text-white' : 'bg-[#00ff66] text-black'
                    }`}
                  >
                    {isGuest ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div>
                    <div
                      className={`p-3 border-2 border-black shadow-[2px_2px_0px_#000] font-mono-data text-xs leading-relaxed ${
                        isGuest
                          ? 'bg-[#1b0a1a] text-slate-100 border-[#d946ef]'
                          : 'bg-black text-slate-200 border-slate-700'
                      }`}
                    >
                      {m.text}
                    </div>

                    <div
                      className={`flex items-center gap-2 mt-1 font-mono-data text-[10px] text-slate-500 ${
                        isGuest ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span>{m.time}</span>
                      {m.intent && (
                        <span className="text-[#00f0ff] uppercase">[{m.intent}]</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Input */}
          <div className="mt-4 pt-3 border-t-2 border-black flex items-center gap-2">
            <input
              type="text"
              placeholder="Type simulated message (e.g. 'Please send 2 extra pool towels to Villa 104')..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-black border-2 border-slate-800 px-3 py-2 text-xs font-mono-data text-white placeholder-slate-500 focus:outline-none focus:border-[#00ff66]"
            />

            <Button variant="green" size="md" onClick={handleSend}>
              <Send className="w-3.5 h-3.5" />
              <span>SEND</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
