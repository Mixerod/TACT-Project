# TEST_CHECKLIST.md — Manual E2E Test Checklist

> Checklist kiểm thử thủ công cho bản build `.exe` thật (Tauri + Python sidecar chạy thật).
> Dùng trước mỗi lần release. Chạy với **profile + file CSV thật**, không phải mock.
>
> Test tự động (Vitest) chỉ phủ logic frontend với MSW/Tauri mock — checklist này
> phủ phần Tauri ↔ Python ↔ filesystem ↔ Windows Explorer mà unit test không chạm tới.

**Môi trường test:**

- [ ] Build `.exe` qua `scripts/build.ps1` (không phải `npm run dev`)
- [ ] Python sidecar tự start khi mở app (status xanh ở sidebar)
- [ ] Có sẵn ít nhất 1 profile đã cấu hình đầy đủ (template + output dir hợp lệ)
- [ ] Có sẵn vài file CSV raw thật từ phần mềm TACT

---

## RUN MODE — Happy path

- [ ] Mở app → Run Mode là tab active
- [ ] Dropdown profiles load đúng danh sách
- [ ] Chọn profile → không có error
- [ ] Drag file CSV thật vào dropzone → file xuất hiện
- [ ] Preview table hiện đúng: mã đơn, màu, confidence
- [ ] Confidence HIGH → badge xanh
- [ ] Bấm Process → progress bar chạy
- [ ] Done → result log hiện success
- [ ] File report xuất hiện đúng thư mục output
- [ ] Nút "Mở thư mục" → Windows Explorer mở đúng folder

---

## RUN MODE — Error cases

- [ ] File CSV không có sheet Condition → warning hiện rõ
- [ ] Regex không match → confidence LOW + cảnh báo vàng
- [ ] Template không tồn tại → error đỏ, block process
- [ ] Sidecar chết giữa chừng → toast error + nút restart
- [ ] File CSV bị corrupt → error rõ ràng, các file khác vẫn chạy

---

## PROFILE MANAGER

- [ ] Tạo profile mới → điền đủ → lưu → xuất hiện trong list
- [ ] Live preview tên file: gõ pattern → preview cập nhật ngay
- [ ] Browse template: chọn file .xlsx → đường dẫn điền vào form
- [ ] Browse output dir: chọn folder → đường dẫn điền vào form
- [ ] Validate: bấm Next khi thiếu tên → highlight field lỗi
- [ ] Edit profile: sửa tên → lưu → list cập nhật
- [ ] Duplicate: tạo bản copy → edit không ảnh hưởng bản gốc
- [ ] Delete: confirm → biến mất → Run Mode dropdown cũng không còn

---

## Phủ bởi test tự động (tham khảo)

Các case dưới đây ĐÃ được kiểm bằng integration test frontend
(`src/components/RunMode/RunMode.test.tsx`, chạy `npm test`), không cần test tay lại
trừ khi nghi ngờ regression ở tầng UI:

| Hành vi | Test tự động |
|---|---|
| Dropdown load đúng danh sách profiles | `profile dropdown loads the full list of profiles` |
| Drag & drop CSV → vào queued list | `file drop: ... adds it to the queued files list` |
| Preview table render đúng số rows + confidence badge | `preview table: ... correct confidence badge` |
| Bỏ tick file → chỉ process file còn lại | `checkbox: ... excludes it from the process request` |
| Streaming /api/process → result log + summary | `streaming: ... success summary` |
| Chưa chọn file → không thể Process | `IDLE: no Process action is available ...` |

Profile Manager (`src/components/ProfileManager/ProfileManager.test.tsx`):

| Hành vi | Test tự động |
|---|---|
| Không có profile → empty state UI | `empty state: shows the placeholder UI ...` |
| Tạo profile → điền form → xuất hiện trong list | `create: filling the form and saving ...` |
| Bỏ trống tên → error message | `validation: leaving the name empty ...` |
| method_code trùng → error message | `validation: a duplicate method_code is rejected ...` |
| Template path lỗi → warning từ validate-profile | `template path: a missing template surfaces a warning ...` |
| Duplicate → tên tự thêm hậu tố copy | `duplicate: clicking Duplicate pre-fills ...` |
| Delete → confirm → biến khỏi list | `delete: confirming the dialog removes ...` |
| Hủy delete → profile vẫn còn | `cancel delete: dismissing the dialog keeps ...` |

> ⚠️ Test tự động chạy trên jsdom với `@tauri-apps/api` và FastAPI **đã mock**.
> Nó KHÔNG chứng minh được: sidecar thật khởi động, file thật được ghi ra ổ đĩa,
> Excel mở đúng ô, hay Windows Explorer mở đúng folder. Đó là lý do checklist tay
> ở trên vẫn bắt buộc trước mỗi release.

---

## SMOKE TEST — Bản build `.msi` trên máy clean

> Chạy **sau khi `scripts/build.ps1` tạo ra file `.msi`**, trên một **máy sạch
> KHÔNG cài Python/Node/Rust** (hoặc VM clean) — để chứng minh installer self-contained.
> Đây là gate cuối cùng trước khi giao cho phòng QC.

- [ ] Cài `.msi` → không lỗi
- [ ] Mở app → cửa sổ hiện trong vòng 5 giây
- [ ] Status dot → xanh trong vòng 10 giây (Python sidecar start)
- [ ] Đổi ngôn ngữ → hoạt động
- [ ] Tạo profile mới → lưu được
- [ ] Chọn file CSV → preview được
- [ ] Process → file output tạo ra đúng
- [ ] Đóng app → mở lại → profiles vẫn còn, ngôn ngữ nhớ
- [ ] Uninstall → sạch (profiles ở `%APPDATA%` vẫn còn)

**Nếu smoke test fail → xem log:**

```
%APPDATA%\TACTAutomation\logs\tact_YYYYMMDD.log
```

(`YYYYMMDD` = ngày chạy, ví dụ `tact_20260601.log`. Profiles nằm tại
`%APPDATA%\TACTAutomation\profiles\` — không bị xóa khi uninstall.)

---

## Ghi chú khi fail

Với mỗi mục fail, ghi lại:

- Bước tái hiện + tên file CSV gây lỗi
- Screenshot UI (đặc biệt message lỗi)
- Log Python sidecar (xem `docs/BUILD_GUIDE.md` mục debug sidecar)
- Profile JSON đang dùng (kiểm tra schema theo `docs/DATA_MODELS.md`)
