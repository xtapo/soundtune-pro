# SoundTune Pro

Phần mềm kiểm tra & cân chỉnh âm thanh chạy trực tiếp trên trình duyệt (không cần cài đặt, không server, không gửi dữ liệu đi đâu).

**Chạy ngay:** https://xtapo.github.io/soundtune-pro/

## Tính năng

### 1. Phân tích phổ tần số thời gian thực (RTA)
- 31 băng tần 1/3 octave chuẩn ISO: 20 Hz → 20 kHz
- Chia 8 vùng: **SUB · BASS · LOW MID · MID · MID HI · HI · TREBLE · AIR**
- Chế độ hiển thị: **Bars** (có vạch giữ đỉnh Peak Hold), **Line** (đường cong), hoặc **cả hai**
- Tốc độ đo: **Chậm · Vừa · Nhanh · Nhấn mạnh hú** + **NearField Sub Mode**
- Con trỏ tương tác: di chuột hoặc chạm để đọc chính xác tần số (Hz / kHz) và mức dBFS

### 2. Thuật toán phát hiện hú rít (Feedback Detection) & cảnh báo giọng nói
- Dò đỉnh dải tần nhọn đột biến vượt **Ngưỡng báo (dB)** cài đặt
- Nội suy parabol 3 điểm để lấy tần số chính xác (ví dụ 375 Hz, 1.73 kHz)
- Cửa sổ cảnh báo hazard màu vàng phát sáng: tần số hú, mức độ, cường độ SPL, thông số cắt **DSP Parametric EQ** (tần số trung tâm, dải tần, Q-Factor, mức cắt dB) và hướng dẫn xử lý
- **Web Speech Synthesis** đọc cảnh báo trực tiếp bằng tiếng Việt

### 3. FR Compare & lưu snapshot DSP (DSP 1 → DSP 6)
- 6 bộ nhớ chụp đáp tuyến tần số, chồng lớp đường cong để so sánh khi cân chỉnh góc loa và không gian phòng
- Xuất ảnh đồ thị ra file **PNG**

### 4. Bộ tính TempoSync (Echo & Reverb Calculator)
- Tính BPM, có nút **TAP TEMPO**
- Echo Delay (ms) theo từng phân khúc nhịp: 1/1, 1/2, 1/4, 1/8, 1/16, 1/32, Dotted, Triplet
- **Total Reverb Time (RT60)**, Pre-Delay, Feedback %, HF Damping, Low Cut cho các dòng vang số DSP

### 5. Bộ mô phỏng hú rít & Test Voice
- Phát tín hiệu giả lập 375 Hz, 1.73 kHz, 1.80 kHz, 2.50 kHz để thử thuật toán và giọng đọc ngay trên trình duyệt, không cần thiết bị ngoài

## Yêu cầu

- Chrome / Edge / Safari bản mới (Web Audio API + getUserMedia + Web Speech Synthesis)
- Truy cập micro chỉ hoạt động qua **HTTPS** hoặc `localhost` (link GitHub Pages ở trên đã là HTTPS)
- Nên tắt Echo Cancellation / Noise Suppression của hệ điều hành để phép đo chính xác (ứng dụng đã yêu cầu tắt qua constraints)

## Ghi chú kỹ thuật

- FFT 16384 @ 48 kHz → ~2.9 Hz mỗi bin, đủ tách các đỉnh hú sát nhau (1.73 kHz vs 1.80 kHz). Chế độ *Nhanh* dùng FFT 8192 để phản ứng tức thì.
- Prominence được tính so với **median nền phổ ±0.55 octave**; Q suy ra từ dải −3 dB quanh đỉnh; mức cắt đề nghị ≈ 0.6 × độ vượt ngưỡng, giới hạn −3 → −12 dB.
- NearField Sub Mode bù cộng hưởng cận trường/biên: −10 dB tại 20 Hz, giảm dần về 0 dB từ ~300 Hz.
- dBFS là mức số nội bộ của trình duyệt. Dùng thanh **Hiệu chuẩn SPL** để khớp với máy đo SPL thật trước khi đọc chỉ số SPL.

## Chạy offline

Tải `index.html` về và mở bằng trình duyệt. Lưu ý: mở bằng `file://` một số trình duyệt sẽ chặn micro — khi đó chạy một web server tĩnh:

```bash
python3 -m http.server 8080
# rồi mở http://localhost:8080
```
