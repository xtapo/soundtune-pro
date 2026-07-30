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

Tải `easy.html` hoặc `index.html` về máy — mỗi file là một ứng dụng độc lập, không phụ thuộc thư viện ngoài. Tuy nhiên nên phục vụ qua https để dùng được micro.

## Giấy phép

MIT — dùng tự do cho công việc cá nhân và dịch vụ âm thanh.
