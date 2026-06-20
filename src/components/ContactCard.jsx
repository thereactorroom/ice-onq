import { Phone, MessageSquare, MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

function cleanPhone(num) {
  return (num || "").replace(/[^+\d]/g, "");
}

export default function ContactCard({ contact, userName }) {
  const phone = cleanPhone(contact.mobile);
  const whatsappMsg = encodeURIComponent(
    `I am with ${userName || "someone"}. I have accessed their ICE profile through ICE onQ.`
  );
  const smsMsg = encodeURIComponent(
    `Emergency: I am with ${userName || "someone"}. Please call back urgently.`
  );

  return (
    <div className={`bg-card rounded-2xl border p-4 ${contact.is_primary ? "border-emergency/30 shadow-md ring-1 ring-emergency/10" : "border-border"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">{contact.full_name}</h4>
            {contact.is_primary && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emergency/10 text-emergency text-[10px] font-bold uppercase">
                <Star className="w-3 h-3 fill-current" />
                Primary
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{contact.relationship}</p>
        </div>
      </div>
      <p className="text-sm font-mono text-foreground mb-3">{contact.mobile}</p>
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" className="flex-1 bg-success hover:bg-success/90 text-white gap-1.5" asChild>
          <a href={`tel:${phone}`}>
            <Phone className="w-3.5 h-3.5" /> Call
          </a>
        </Button>
        <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-green-600 border-green-200 hover:bg-green-50" asChild>
          <a href={`https://wa.me/${phone}?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
        </Button>
        <Button size="sm" variant="outline" className="flex-1 gap-1.5" asChild>
          <a href={`sms:${phone}?body=${smsMsg}`}>
            <MessageSquare className="w-3.5 h-3.5" /> SMS
          </a>
        </Button>
      </div>
    </div>
  );
}