# the quiet hours.

*a little time, just for you.*

Một góc nhỏ yên tĩnh để tập trung và nghỉ ngơi. Pomodoro thuần HTML, CSS và JavaScript, dùng màu phẳng, font Google Fonts với fallback hệ thống và lưu dữ liệu trên thiết bị. Không framework, không backend, không cần tài khoản, không cài npm và không có bước build.

## Có gì ở đây?

- Ba chế độ: **focus 25 phút**, **short break 5 phút**, **long break 15 phút**.
- Bắt đầu, tạm dừng, tiếp tục, đặt lại và bỏ qua phiên.
- Sau bốn phiên focus hoàn thành, chuẩn bị nghỉ dài. Reset, skip và đổi chế độ không cộng tiến độ.
- Tùy chỉnh từng khoảng thời gian từ 1 đến 180 phút; tự bắt đầu phiên tiếp theo là lựa chọn, mặc định tắt.
- Đếm phiên focus hoàn thành và số phút theo ngày tại múi giờ của thiết bị.
- Một dòng ý định ngắn, tối đa 100 ký tự; có thể viết tiếng Việt.
- Giao diện sáng, tối hoặc theo thiết bị; hỗ trợ bàn phím và giảm chuyển động.
- Chuông nhẹ được tạo bằng Web Audio, có âm lượng và nút nghe thử. **Mặc định tắt**, chỉ mở âm thanh sau thao tác của người dùng.
- Thông báo desktop tùy chọn, chỉ xin quyền khi người dùng bật trong settings.
- Hiển thị thời gian trên tiêu đề tab; khôi phục timer sau khi tải lại trang.
- Các tab cùng địa chỉ chia sẻ một timer qua localStorage, có Web Locks và cơ chế khóa dự phòng để tránh ghi trùng.
- Dữ liệu và đồng hồ đều xử lý cục bộ; chỉ có font được tải từ Google Fonts khi có kết nối mạng. Khi offline, trang dùng font dự phòng.

## Cấu trúc

```text
the-quiet-hours/
├── index.html
├── style.css
├── script.js
├── assets/
│   └── sprig.svg
└── README.md
```

## Chạy trên máy

1. Giải nén thư mục dự án.
2. Mở `index.html` bằng trình duyệt hiện đại.
3. Bấm **begin**. Không cần internet hoặc cài đặt gì thêm.

Trình duyệt có thể giới hạn lưu trữ, thông báo hoặc chia sẻ dữ liệu giữa các trang `file://`. Timer vẫn chạy bằng bộ nhớ trong nếu localStorage bị chặn; trang sẽ hiển thị thông báo. Để có địa chỉ ổn định cho việc lưu và đồng bộ tab, dùng GitHub Pages hoặc máy chủ tĩnh cục bộ.

Nếu đã có Python, có thể chạy tùy chọn trong thư mục chứa `index.html`:

```bash
python -m http.server 8000
```

Sau đó mở `http://localhost:8000`. Đây chỉ là cách xem thử; dự án không phụ thuộc Python.

## Đưa lên GitHub Pages

1. Đăng nhập GitHub, tạo **public repository** tên `the-quiet-hours`.
2. Chọn **Add file → Upload files**. Kéo **các file và thư mục bên trong** `the-quiet-hours/` vào repository, rồi commit lên nhánh `main`.
3. Kiểm tra `index.html`, `style.css`, `script.js` và `assets/` nằm ngay tại gốc repository. Không upload riêng file ZIP; không lồng thêm một thư mục `the-quiet-hours/` bên ngoài.
4. Mở **Settings → Pages**.
5. Trong **Build and deployment → Source**, chọn **Deploy from a branch**.
6. Chọn nhánh **main**, thư mục **/ (root)**, rồi bấm **Save**.
7. Đợi GitHub hoàn tất lần triển khai đầu tiên. Trang Pages sẽ hiển thị URL website. Nếu chưa thấy, kiểm tra tab **Actions** của repository.
8. Mở `https://USERNAME.github.io/the-quiet-hours/`, thay `USERNAME` bằng tài khoản của bạn.

Tất cả đường dẫn asset đều tương đối, bắt đầu bằng `./`, nên chạy được dưới tên repository bất kỳ. Các lần commit tiếp theo vào nhánh đã chọn sẽ cập nhật website.

Tài liệu tham khảo: [Configuring a publishing source for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Tùy chỉnh

### Màu sắc

Sửa CSS custom properties tại `:root` và `:root[data-theme="dark"]` trong `style.css`. `--background`, `--text`, `--accent`, `--surface` và `--border` xác định bảng màu. `--secondary` dùng cho chữ nhỏ với độ tương phản cao hơn `--muted`; `--button` và `--accent-text` giúp nút và nhãn dễ đọc.

Chỉ dùng màu phẳng. Dự án không có gradient, ảnh nền chuyển động hay thư viện animation.

### Font chữ

Các khai báo `@font-face` đầu `style.css` tải font từ `assets/fonts/`. `--serif` dành cho tên trang, câu dẫn và timer; `--sans` dành cho nút và nội dung phụ. Để đổi font, thêm font có giấy phép phù hợp, cập nhật `@font-face` và giữ lại attribution. Cormorant Garamond có ký tự tiếng Việt; các ký tự không có trong DM Sans sẽ dùng font hệ thống kế tiếp trong danh sách, gồm Segoe UI trên Windows.

### Thời lượng

Người dùng có thể đổi trong **settings**. Để đổi mặc định cho lần truy cập đầu tiên, sửa `DEFAULT_SETTINGS.durations` gần đầu `script.js`. Giá trị là số phút nguyên từ 1 đến 180.

Thay đổi settings không làm mất thời gian của phiên đang chạy hoặc tạm dừng. Thời lượng mới áp dụng cho phiên idle, lần reset, đổi chế độ hoặc phiên kế tiếp. Người đã lưu settings sẽ tiếp tục dùng lựa chọn của mình, thay vì tự động nhận mặc định mới từ source.

### Câu chữ

Sửa nội dung tĩnh trong `index.html`. Các câu ngắn đổi giữa phiên nằm trong mảng `MESSAGES` ở `script.js`. Giao diện chính giữ chữ thường để tạo cảm giác nhẹ nhàng.

## Timer hoạt động thế nào?

Timer lưu thời điểm kết thúc `endsAt` và tính thời gian còn lại bằng `endsAt - Date.now()`. Vòng lặp 250 ms chỉ cập nhật hiển thị, không dùng để đếm từng giây. Khi chuyển tab hoặc tải lại, trang đọc lại mốc thời gian đã lưu.

Chỉ phiên focus chạy đến hết mới được tính. Tổng phút là thời lượng thực tế đã chọn cho các phiên focus hoàn thành; thời gian nghỉ và phiên dở dang không cộng vào tổng. Phiên được ghi vào ngày tại thời điểm kết thúc, theo múi giờ thiết bị; thống kê hiển thị đổi ngày tự động khi trang đang mở.

Khi trình duyệt ngủ hoặc đóng lâu, lúc mở lại trang chỉ hoàn tất **phiên đã thực sự bắt đầu**. Nếu auto-start bật, phiên kế tiếp bắt đầu từ thời điểm trang xử lý lại; không tự tạo một loạt phiên hoàn thành trong lúc bạn vắng mặt. Skip luôn chuẩn bị phiên kế tiếp ở trạng thái dừng, kể cả khi auto-start đang bật.

Một bản ghi trạng thái chứa cả timer và tiến độ giúp các tab nhận chung kết quả. Web Locks tuần tự hóa các thay đổi khi khả dụng. Trình duyệt không có Web Locks dùng một khóa localStorage ngắn hạn theo cơ chế best effort; không thể cam kết tính nguyên tử tuyệt đối cho các tab bị đóng băng hoặc sự cố trình duyệt. Tránh chỉnh đồng hồ hệ thống trong khi chạy vì mốc thời gian dùng giờ thiết bị.

## Lưu trữ & riêng tư

Không có tài khoản, analytics, cookie theo dõi hoặc kết nối mạng trong mã ứng dụng.

localStorage dùng các khóa:

| Khóa | Nội dung |
| --- | --- |
| `the-quiet-hours:v1` | Settings, theme, timer hiện tại, số phiên trong chu kỳ, tiến độ từng ngày, dòng ý định và câu nhắn hiện tại. |
| `the-quiet-hours:v1:lease` | Khóa ngắn hạn để đồng bộ ghi giữa các tab khi Web Locks không khả dụng; tự hết hạn. |

Dữ liệu thuộc trình duyệt và origin đang mở; không đồng bộ qua máy khác. Các dự án cùng origin GitHub Pages của một tài khoản có thể chia sẻ các khóa này nếu cùng chạy bản ứng dụng này. Chế độ riêng tư có thể xóa dữ liệu khi đóng cửa sổ. Xóa dữ liệu site trong cài đặt trình duyệt sẽ xóa tiến độ và settings. Khi localStorage hỏng, bị chặn hoặc hết dung lượng, timer tiếp tục hoạt động trong bộ nhớ cho lần truy cập đó.

## Âm thanh & thông báo

Chuông được tổng hợp bằng các sóng sine qua Web Audio API; không có file âm thanh bên ngoài. Trang không tạo AudioContext khi tải ban đầu và không phát chuông cho phiên đã hết trước khi tải lại. Nếu bạn mở nhiều tab, tab xử lý hoàn tất có thể không phải tab đã được cho phép phát âm thanh; khi đó chuông có thể không phát. Trình duyệt và hệ điều hành cũng có thể chặn tiếng hoặc thông báo khi tab bị ngủ.

Thông báo desktop cần hỗ trợ của trình duyệt, địa chỉ an toàn như HTTPS/localhost và quyền người dùng. Nếu không khả dụng hoặc đã bị từ chối, giao diện giải thích và vô hiệu hóa lựa chọn. Không có service worker hoặc backend, nên **không thể phát chuông hay thông báo đúng giờ khi trình duyệt đã đóng**. Khi mở lại, timer vẫn đối chiếu thời gian đã lưu.

Không thêm ambient rain: website giữ gọn, không có nút giả hoặc phụ thuộc dịch vụ phát nhạc.

## Accessibility & kiểm tra

- HTML có ngữ nghĩa, nhãn điều khiển, skip link và focus indicator rõ ràng.
- Timer không đọc liên tục mỗi giây cho screen reader; chỉ thông báo khi bắt đầu, tạm dừng hoặc hoàn tất phiên.
- Settings dùng native dialog với focus trap, nút đóng và phím Escape; focus trở lại nút settings khi đóng.
- Trạng thái nút mode dùng `aria-pressed`, tiến trình dùng `progressbar` và thời gian có nhãn dễ đọc.
- CSS tôn trọng `prefers-reduced-motion`; thiết kế mobile-first.

Đã kiểm tra khi bàn giao:

- **27/27 kiểm tra tự động đạt**: chu kỳ focus/nghỉ, timestamp, pause/resume, refresh, reset/skip, ngày mới, thời lượng tùy chỉnh, dữ liệu lỗi, localStorage bị chặn, không tạo nhiều interval, âm thanh không chạy lúc load và xử lý lỗi quyền thông báo. Các kiểm tra API audio/thông báo có sử dụng mô phỏng; không thay thế kiểm tra trên thiết bị thật.
- Trình duyệt Chromium: chạy một phiên focus 1 phút thực tế, mở hai tab, pause/resume giữa hai tab, refresh khi đang chạy và xác nhận chỉ cộng một phiên hoàn thành.
- Đo bố cục ở các viewport iframe **320, 375, 390, 768, 1440px**: không tràn ngang; kiểm tra trực quan hộp settings ở 320px, giao diện sáng/tối và dòng ý định tiếng Việt.
- Kiểm tra dưới thư mục con HTTP tương tự đường dẫn repository GitHub Pages; các font, CSS và JavaScript dùng đường dẫn tương đối.

Giới hạn: chưa triển khai lên tài khoản GitHub thật; chưa kiểm tra trực tiếp `file://` vì trình duyệt kiểm thử chỉ cho phép HTTP/HTTPS; chưa kiểm tra thông báo desktop với quyền được cấp trên HTTPS hoặc âm thanh nghe được trên thiết bị thật. Chưa kiểm tra Safari/Firefox hay điện thoại vật lý. Không phát hiện lỗi JavaScript từ mã ứng dụng trong lượt kiểm tra trình duyệt.

Có thể kiểm tra nhanh trên máy bạn: begin → pause → continue; refresh khi đang chạy; mở thêm một tab; đổi settings; thử một phiên focus 1 phút; dùng reset/skip và kiểm tra tổng không tăng.

## Attribution

- [Cormorant Garamond](https://github.com/CatharsisFonts/Cormorant): Copyright 2015 The Cormorant Project Authors. SIL Open Font License 1.1; bản license nằm tại `assets/fonts/Cormorant-Garamond-OFL.txt`.
- [DM Sans](https://github.com/googlefonts/dm-fonts): xem copyright và SIL Open Font License 1.1 trong `assets/fonts/DM-Sans-OFL.txt`.
- Font lấy từ [Google Fonts repository](https://github.com/google/fonts), chuyển định dạng sang WOFF để lưu và tải cục bộ; không đổi tên font nội bộ hoặc nội dung glyph.
- Biểu tượng nhánh lá, tách trà và các nét điều khiển SVG được vẽ riêng cho dự án. Không dùng ảnh stock, bộ icon bên ngoài hoặc audio cần ghi công.
