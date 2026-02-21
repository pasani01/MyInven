# app/scan_view.py
# Bu dosyayı app/views.py'nin sonuna ekle veya ayrı dosya olarak import et

import json
import pytesseract
from PIL import Image
from groq import Groq
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.core.files.uploadedfile import InMemoryUploadedFile
import io

# Windows'ta Tesseract yolu — Linux'ta bu satıra gerek yok
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

GROQ_API_KEY = "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"


class InvoiceScanView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # 1. Dosyayı al
        image_file = request.FILES.get("image")
        if not image_file:
            return Response(
                {"detail": "Lütfen 'image' alanında bir resim gönderin."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. OCR ile metne dönüştür
        try:
            img = Image.open(image_file)
            raw_text = pytesseract.image_to_string(img, lang='rus+uzb+eng')
        except Exception as e:
            return Response(
                {"detail": f"OCR hatası: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        if not raw_text.strip():
            return Response(
                {"detail": "Resimden metin okunamadı. Daha net bir resim deneyin."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Groq AI ile JSON formatına getir
        try:
            client = Groq(api_key=GROQ_API_KEY)
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": """Sen bir fatura analiz asistanısın. Sadece saf JSON döndür.
Fiyatı 0 olanları gösterme. Eşya adlarını Özbekçe Latin alfabesine çevir.
Format: {"urunler": [{"ad": "...", "adet": 0, "birlik": "adet/kg/ml/dona", "birim_fiyat": 0.0}]}
Başka hiçbir şey yazma, sadece JSON."""
                    },
                    {
                        "role": "user",
                        "content": f"Bu fatura metnini analiz et:\n\n{raw_text}"
                    }
                ],
                response_format={"type": "json_object"}
            )
            json_str = completion.choices[0].message.content
            data = json.loads(json_str)
        except Exception as e:
            return Response(
                {"detail": f"AI hatası: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 4. Frontend için formatla
        urunler = data.get("urunler", [])
        lines = []
        for i, u in enumerate(urunler):
            adet = float(u.get("adet", 0))
            fiyat = float(u.get("birim_fiyat", 0))
            if fiyat == 0:
                continue  # Fiyatı 0 olanları atla
            lines.append({
                "id": i + 1,
                "desc": u.get("ad", "Bilinmiyor"),
                "qty": adet,
                "price": str(fiyat),
                "cur": u.get("cur", "UZS"),
                "birlik": u.get("birlik", "adet"),
                "warn": False,
            })

        return Response({
            "lines": lines,
            "raw_text": raw_text,  # Debug için
            "item_count": len(lines),
        })