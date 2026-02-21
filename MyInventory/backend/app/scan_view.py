# app/scan_view.py
# Tesseract GEREKMEZ — Groq Vision API direkt resmi okuyur
# pip install groq  (tek bağımlılık)

import json
import base64
from groq import Groq
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

GROQ_API_KEY = "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"


class InvoiceScanView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # 1. Resmi al
        image_file = request.FILES.get("image")
        if not image_file:
            return Response(
                {"detail": "Iltimos 'image' maydonida rasm yuboring."},
                status=status.HTTP_400_BAD_REQUEST
            )

        allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if image_file.content_type not in allowed:
            return Response(
                {"detail": "Faqat JPG, PNG yoki WEBP yuklay olasiz."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Resmi base64'e çevir — server'da hiç fayl saqlanmaydi
        image_data = base64.standard_b64encode(image_file.read()).decode("utf-8")
        media_type = image_file.content_type

        # 3. Groq Vision — direkt resmi ko'radi
        try:
            client = Groq(api_key=GROQ_API_KEY)
            completion = client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{media_type};base64,{image_data}"
                                }
                            },
                            {
                                "type": "text",
                                "text": (
                                    "Bu fatura yoki chek resmini analiz qil.\n"
                                    "Rasm o'zbek, rus yoki ingliz tilida bo'lishi mumkin — barchasi ishlaydi.\n"
                                    "Barcha mahsulot nomlarini o'zbek lotin alifbosiga o'girib yoz.\n\n"
                                    "MUHIM QOIDALAR:\n"
                                    "- Agar mahsulotning narxi ko'rsatilmagan bo'lsa, 'birim_fiyat' ni 0 qilib yoz — mahsulotni o'tkazib yuborme.\n"
                                    "- Agar miqdor ko'rsatilmagan bo'lsa, 'adet' ni 1 qilib yoz.\n"
                                    "- Agar birlik ko'rsatilmagan bo'lsa, 'birlik' ni 'dona' qilib yoz.\n"
                                    "- Faqat sof JSON qaytadir, boshqa hech narsa yozma.\n\n"
                                    "Aynan shu formatda qaytadir:\n"
                                    '{"urunler": [{"ad": "Mahsulot nomi", "adet": 2, "birlik": "dona", "birim_fiyat": 15000.0}]}'
                                )
                            }
                        ]
                    }
                ],
                response_format={"type": "json_object"},
                max_tokens=2048,
            )

            json_str = completion.choices[0].message.content
            data = json.loads(json_str)

        except json.JSONDecodeError:
            return Response(
                {"detail": "AI javobi JSON formatida emas."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {"detail": f"AI xatosi: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 4. Frontend uchun formatlash
        # Narxi 0 bo'lsa ham qo'shiladi, faqat warn=True bilan belgilanadi
        urunler = data.get("urunler", [])
        lines = []
        for i, u in enumerate(urunler):
            adet  = float(u.get("adet", 1) or 1)       # None yoki 0 bo'lsa 1
            fiyat = float(u.get("birim_fiyat", 0) or 0) # None bo'lsa 0
            lines.append({
                "id":     i + 1,
                "desc":   u.get("ad", "Noma'lum"),
                "qty":    adet,
                "price":  str(fiyat),
                "cur":    "UZS",
                "birlik": u.get("birlik", "dona") or "dona",
                "warn":   fiyat == 0,   # Narxi yo'q bo'lsa sariq belgi
            })

        if not lines:
            return Response(
                {"detail": "Rasmdan mahsulot topib bo'lmadi. Aniqroq rasm yuklang."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            "lines":      lines,
            "item_count": len(lines),
        })