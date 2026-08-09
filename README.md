# 🎚️ SoundTune Pro

Bộ công cụ kiểm tra & cân chỉnh âm thanh chạy trực tiếp trên trình duyệt. Không cần cài đặt, không cần thiết bị đo chuyên dụng — chỉ cần điện thoại hoặc laptop có micro.

## Hai chế độ

| Chế độ | Dành cho | Mở |
| --- | --- | --- |
| **🟢 Chế độ Dễ** | Người không biết gì về âm thanh. Làm theo 3 bước, máy chấm điểm và nói rõ xoay núm nào, tăng/giảm bao nhiêu dB. | [easy.html](easy.html) |
| **🔵 Chuyên nghiệp (RTA)** | Kỹ thuật viên, người đã quen DSP/mixer. Phụ đồ 31 băng tần, snapshot DSP, TempoSync… | [index.html](index.html) |

**Link chạy trực tiếp:**

- Chế độ Dễ: https://xtapo.github.io/soundtune-pro/easy.html
- Bản chuyên nghiệp: https://xtapo.github.io/soundtune-pro/

## Chế độ Dễ có gì (easy.html)

- **Chọn kiểu dàn**: Karaoke gia đình · Loa kéo/di động · Hội trường/Sân khấu · Họp/Nhà thờ (giọng nói) · Cafe/Nhạc nền. Mỗi kiểu có đường đáp tuyến mục tiêu riêng.
- **Tự phát tiếng rè chuẩn (pink noise)** để đo chính xác, hoặc đo bằng một bài nhạc quen thuộc.
- **Chấm điểm 0–100** kèm đèn màu và so điểm trước / sau khi chỉnh.
- **Danh sách việc cần làm bằng tiếng Việt thường ngày**, ví dụ: “Tiếng bị ù, nặng đầu → GIẢM khoảng 3.5 dB ở núm LOW/BASS”.
- **Phát hiện phòng bị dội** (cross-hair cộng hưởng phòng) kèm thông số cắt Fc / Q / dB.
- **Cảnh báo hú rít tự động + giọng đọc tiếng Việt** ngay trong lúc hát.
- **Bộ tính Echo/Vang** có TAP TEMPO, ra số DLY (ms), RPT, RT60, LO/HI cut theo từng kiểu hát.
- **Hướng dẫn “chỗ nào là núm nào”** cho amply karaoke, mixer và DSP.
- Xuất ảnh kết quả PNG.

## Bản chuyên nghiệp có gì (index.html)

- Phân tích phổ thời gian thực **31 băng tần ISO 1/3 octave (20 Hz – 20 kHz)**, chia 8 vùng: SUB, BASS, LOW MID, MID, MID HI, HI, TREBLE, AIR.
- Hiển thị **Bars có Peak Hold / Line / cả hai**; tốc độ đo Chậm · Vừa · Nhanh · Nhấn mạnh hú; chế độ **NearField Sub**.
- Con trỏ tương tác đọc chính xác tần số (Hz/kHz) và mức dBFS.
- **Thuật toán phát hiện hú rít** kèm cảnh báo hazard vàng: tần số hú, mức độ, SPL, thông số cắt Parametric EQ (Fc, BW, Q, Gain) và hướng dẫn xử lý + giọng đọc tiếng Việt.
- **FR Compare**: lưu 6 snapshot **DSP 1 – DSP 6** để chồng đường cong so sánh, xuất ảnh PNG.
- **TempoSync**: TAP TEMPO, bảng Echo Delay theo 1/1 – 1/2 – 1/4 – 1/8 – 1/16, Dotted, Triplet và tính RT60.
- **Bộ mô phỏng hú rít** 375 Hz · 1.73 kHz · 1.80 kHz · 2.50 kHz để thử thuật toán và giọng đọc không cần thiết bị ngoài.

## Lưu ý khi sử dụng

- Micro chỉ hoạt động khi trang được mở bằng **https** (không mở bằng `file://`).
- Nên dùng **Chrome** hoặc **Edge** để có giọng đọc tiếng Việt (Web Speech Synthesis).
- Đặt máy ở chỗ người nghe, cao ngang tai, cách loa ít nhất 2 m.
- Micro điện thoại/laptop không phải micro đo chuẩn nên số liệu mang tính **tương đối**; rất tốt để tìm chỗ thừa/thiếu và so trước – sau, nhưng tai người vẫn quyết định cuối cùng.

## Chạy offline

Ứng dụng là PWA: mở bằng https một lần rồi cài vào máy (Thêm vào màn hình chính / Install), sau đó dùng được khi mất mạng. Nếu muốn chạy từ máy, hãy tải cả thư mục (`index.html`, `easy.html`, `app.js`, `easy.js`, `extras.js`, `lab.js`, `ring.js`, `dsp.js`, `sw.js`, `manifest.webmanifest`, `icon*.svg`) và phục vụ qua một web server https cục bộ — micro không hoạt động khi mở bằng `file://`. Không phụ thuộc thư viện ngoài.

## Nhật ký thay đổi

### v2 — Bộ dò hú rít (08/2026)

Bản trước hay báo sai tần số hú. Năm nguyên nhân và cách sửa:

| Lỗi | Cách sửa |
| --- | --- |
| Chọn **đỉnh to nhất** trong 70 Hz – 9 kHz nên tiếng bass/trống luôn thắng vạch hú | Xếp hạng theo **độ nhô so với nền phổ** (prominence); nền tính bằng **trung vị** trên lưới 1/6 octave nên vạch hú không tự kéo nền của chính nó lên |
| Không xử lý hoạ âm, hú méo tiếng thì bậc 2–3 có thể vượt tần số gốc | Lùi về tần số gốc khi đỉnh đang xét đúng bằng m lần (m = 2…5) một đỉnh thấp hơn còn mạnh |
| Dung sai bám tần số 3 % gộp nhầm 1.73 kHz với 1.80 kHz, lại làm trơn trượt mỗi khung nên số báo trôi liên tục | Siết xuống **1.5 %** và khoá tần số bằng **trung vị 15 khung** gần nhất |
| Nội suy parabol chạy cả khi không phải đỉnh, lệch tới 1 bin | Chỉ chạy khi đạo hàm bậc hai âm, giới hạn lệch ±0.5 bin |
| Trần quét 9 kHz bỏ sót hú trên loa horn | Mở rộng dải quét thành **60 Hz – 12 kHz** |

Bổ sung chip **“Nghi hú — 3 đỉnh nhô nhất”** dưới đồ thị bản chuyên nghiệp để đối chiếu bằng mắt xem máy đang cân nhắc những tần số nào.

Chế độ Dễ (`easy.js`) được vá cùng hướng: lùi hoạ âm về tần số gốc, và **báo tần số thật** bằng nội suy trên bin FFT thay vì đọc tâm băng 1/3 octave (trước đây lệch tới 12 %, ví dụ hú 1730 Hz bị báo là 1600 Hz). Dải cảnh báo mở rộng thành 80 Hz – 12.5 kHz.

Giữ nguyên bộ lọc chống báo nhầm giọng nói (`voiceComb`) và điều kiện phải đứng yên đủ lâu mới báo — tiếng hát và nhạc cụ luôn vi phạm hai điều này, hú rít thì không.

## Giấy phép

MIT — dùng tự do cho công việc cá nhân và dịch vụ âm thanh.
