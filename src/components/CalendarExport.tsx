import { Printer, FileDown, Share2, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { CalendarEvent } from "@/components/CalendarGrid";

interface Props {
  events: CalendarEvent[];
  creatorName: string;
  month: number;
  year: number;
}

export default function CalendarExport({ events, creatorName, month, year }: Props) {
  const monthName = new Date(year, month - 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  const generatePrintContent = () => {
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
    const grouped: Record<string, typeof events> = {};
    sorted.forEach(ev => {
      if (!grouped[ev.date]) grouped[ev.date] = [];
      grouped[ev.date].push(ev);
    });

    const platformEmoji: Record<string, string> = { instagram: "📸", tiktok: "🎵", x: "𝕏", telegram_vip: "💎" };
    const typeEmoji: Record<string, string> = { photo: "📷", video: "🎬", text: "📝", pack: "✨" };

    let html = `<html><head><title>Plan ${creatorName} - ${monthName}</title>
    <style>
      body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#1a1a1a;}
      h1{text-align:center;color:#e11d48;margin-bottom:4px;}
      h2{color:#444;font-size:14px;text-align:center;margin-bottom:24px;}
      .day{margin-bottom:16px;break-inside:avoid;}
      .day-header{font-weight:700;font-size:14px;padding:6px 12px;background:#f8f8f8;border-radius:8px;margin-bottom:6px;}
      .event{display:flex;gap:8px;padding:6px 12px;border-left:3px solid #e11d48;margin-bottom:4px;font-size:12px;}
      .event.premium{border-left-color:#f59e0b;background:#fffbeb;}
      .time{color:#888;min-width:40px;}
      .platform{font-weight:600;}
      .title{font-weight:500;}
      .desc{color:#666;}
      @media print{body{padding:10px;font-size:11px;}}
    </style></head><body>
    <h1>📅 Plan de Contenido</h1>
    <h2>${creatorName} — ${monthName} • ${events.length} publicaciones</h2>`;

    Object.entries(grouped).forEach(([date, dayEvents]) => {
      const d = new Date(date + "T00:00:00");
      const dayStr = d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "short" });
      html += `<div class="day"><div class="day-header">${dayStr} (${dayEvents.length})</div>`;
      dayEvents.forEach(ev => {
        html += `<div class="event${ev.is_premium ? " premium" : ""}">
          <span class="time">${ev.time || "--:--"}</span>
          <span class="platform">${platformEmoji[ev.platform] || "📌"}</span>
          <span class="title">${typeEmoji[ev.type] || ""} ${ev.title}</span>
          <span class="desc">— ${ev.description}</span>
        </div>`;
      });
      html += `</div>`;
    });

    html += `</body></html>`;
    return html;
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) { toast.error("Popup bloqueado"); return; }
    w.document.write(generatePrintContent());
    w.document.close();
    setTimeout(() => w.print(), 500);
    toast.success("📄 Abriendo vista de impresión");
  };

  const handlePDF = () => {
    const w = window.open("", "_blank");
    if (!w) { toast.error("Popup bloqueado"); return; }
    w.document.write(generatePrintContent());
    w.document.close();
    setTimeout(() => w.print(), 500);
    toast.success("📥 Usa 'Guardar como PDF' en el diálogo de impresión");
  };

  const handleWhatsApp = () => {
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    const grouped: Record<string, typeof events> = {};
    sorted.forEach(ev => {
      if (!grouped[ev.date]) grouped[ev.date] = [];
      grouped[ev.date].push(ev);
    });

    let text = `📅 *Plan de Contenido*\n👤 ${creatorName} — ${monthName}\n📊 ${events.length} publicaciones\n\n`;
    
    const platformEmoji: Record<string, string> = { instagram: "📸", tiktok: "🎵", x: "𝕏", telegram_vip: "💎" };

    Object.entries(grouped).slice(0, 15).forEach(([date, dayEvents]) => {
      const d = new Date(date + "T00:00:00");
      const dayStr = d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
      text += `*${dayStr}* (${dayEvents.length})\n`;
      dayEvents.forEach(ev => {
        text += `  ${platformEmoji[ev.platform] || "📌"} ${ev.time || ""} ${ev.title}${ev.is_premium ? " 👑" : ""}\n`;
      });
      text += "\n";
    });

    if (Object.keys(grouped).length > 15) text += `...y ${Object.keys(grouped).length - 15} días más`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    toast.success("📱 Abriendo WhatsApp");
  };

  const handleCalendarAlerts = () => {
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    
    let ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//CreatorAI//ContentPlan//ES\nCALSCALE:GREGORIAN\n`;

    sorted.forEach(ev => {
      const date = ev.date.replace(/-/g, "");
      const time = ev.time ? ev.time.replace(":", "") + "00" : "120000";
      const dtStart = `${date}T${time}`;
      const platformLabel: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", x: "X", telegram_vip: "Telegram VIP" };
      
      ics += `BEGIN:VEVENT\n`;
      ics += `DTSTART:${dtStart}\n`;
      ics += `DURATION:PT30M\n`;
      ics += `SUMMARY:[${platformLabel[ev.platform] || ev.platform}] ${ev.title}\n`;
      ics += `DESCRIPTION:${ev.description}${ev.is_premium ? " (Premium)" : ""}\n`;
      ics += `END:VEVENT\n`;
    });

    ics += `END:VCALENDAR`;

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan-${creatorName.toLowerCase().replace(/\s/g, "-")}-${monthName.replace(/\s/g, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("📅 Archivo .ics descargado — impórtalo en tu calendario");
  };

  if (events.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs gap-1.5">
        <Printer className="w-3.5 h-3.5" /> Imprimir
      </Button>
      <Button variant="outline" size="sm" onClick={handlePDF} className="text-xs gap-1.5">
        <FileDown className="w-3.5 h-3.5" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={handleWhatsApp} className="text-xs gap-1.5">
        <Share2 className="w-3.5 h-3.5" /> WhatsApp
      </Button>
      <Button variant="outline" size="sm" onClick={handleCalendarAlerts} className="text-xs gap-1.5">
        <CalendarPlus className="w-3.5 h-3.5" /> Alertas (.ics)
      </Button>
    </div>
  );
}
