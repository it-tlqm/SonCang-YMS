SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict VhqBZWHuhVWlNoJuyc22vtOqv5da2KGzMb2xbgdRbKDfd8vBb4KGWVBMPMbxF2Z

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'a4dbb64f-a8be-4fa1-995c-4e50423c840f', 'authenticated', 'authenticated', 'sys_admin_uat@example.com', '$2a$10$wjL7spVvYYUUkuy863iDDuWw7W2zrZouTcVreVebsSkKdjGoxHdDS', '2026-10-12 05:06:18.018959+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-10-12 05:33:47.75363+00', '{"provider": "email", "providers": ["email"]}', '{"full_name": "Quản trị viên UAT", "role_code": "SYS_ADMIN", "email_verified": true}', NULL, '2026-10-12 05:06:17.986321+00', '2026-10-12 05:33:47.774632+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'a79c19fe-394c-438d-843b-fab7e278edf2', 'authenticated', 'authenticated', 'sec_staff_uat@example.com', '$2a$10$pAbepXf4uKuTyYABXiMuLOmH1Y/EK356GsByvVZkGCuQJkX5WJynq', '2026-10-12 05:06:18.23346+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-10-12 05:48:13.791513+00', '{"provider": "email", "providers": ["email"]}', '{"full_name": "Nhân viên An ninh Cổng UAT", "role_code": "SEC_STAFF", "email_verified": true}', NULL, '2026-10-12 05:06:18.22867+00', '2026-10-12 05:48:13.800505+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '8e397d0c-bd78-4276-95ae-f6d4ff6414b3', 'authenticated', 'authenticated', 'sec_lead_uat@example.com', '$2a$10$Y/9lqEp0C6QlfvU8nJPa/OqHVa3Ri3VMFn5dikSUtyUMTxXxMEFKC', '2026-10-12 05:06:18.453515+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-10-12 05:48:40.849846+00', '{"provider": "email", "providers": ["email"]}', '{"full_name": "Tổ trưởng An ninh Cổng UAT", "role_code": "SEC_LEAD", "email_verified": true}', NULL, '2026-10-12 05:06:18.450292+00', '2026-10-12 05:48:40.853911+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'a597343d-9fbe-48e2-92cf-bf4491ff3f27', 'authenticated', 'authenticated', 'cckb_staff_uat@example.com', '$2a$10$SY.Fz.MOjzjw6LnUCXSz4OHXRNzgd5HqydvZ5dX2HPC1v2bNpP5Hi', '2026-10-12 05:06:18.659405+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-10-12 05:48:59.378311+00', '{"provider": "email", "providers": ["email"]}', '{"full_name": "Nhân viên CCKB UAT", "role_code": "PORT_STAFF", "email_verified": true}', NULL, '2026-10-12 05:06:18.656828+00', '2026-10-12 05:48:59.382348+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '0c190264-587e-4f61-8048-4dab2126fc9d', 'authenticated', 'authenticated', 'cckb_lead_uat@example.com', '$2a$10$pBQRqXV5gjJ07Yd.HQwDeeUdB76CHhWjSQMiw2E.iSXxP6ULO0v2W', '2026-10-12 05:06:18.853619+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-10-12 05:49:14.023422+00', '{"provider": "email", "providers": ["email"]}', '{"full_name": "Lãnh đạo CCKB UAT", "role_code": "PORT_LEAD", "email_verified": true}', NULL, '2026-10-12 05:06:18.851115+00', '2026-10-12 05:49:14.026958+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'e305264e-5ddc-4830-b877-c5f11e1b3cc0', 'authenticated', 'authenticated', 'dis_staff_uat@example.com', '$2a$10$OIufV7.EGkMhPIZKLLVz2ePgSq9DK5SROIMEXss4i8dRoAFiPiar2', '2026-10-12 05:06:19.046094+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-10-12 05:49:31.865656+00', '{"provider": "email", "providers": ["email"]}', '{"full_name": "Nhân viên Điều phối Bãi UAT", "role_code": "DIS_STAFF", "email_verified": true}', NULL, '2026-10-12 05:06:19.043456+00', '2026-10-12 05:49:31.882838+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '60a7f530-23eb-478c-8062-97f58b6c114a', 'authenticated', 'authenticated', 'dis_lead_uat@example.com', '$2a$10$AujP/GjrzAnUpl9..slRXuaXpPKD3ofJOKslqcmI4XN.XIIsjB9cu', '2026-10-12 05:06:19.227349+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-10-12 05:49:50.9986+00', '{"provider": "email", "providers": ["email"]}', '{"full_name": "Tổ trưởng Điều phối Bãi UAT", "role_code": "DIS_LEAD", "email_verified": true}', NULL, '2026-10-12 05:06:19.22499+00', '2026-10-12 05:49:51.001365+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('a4dbb64f-a8be-4fa1-995c-4e50423c840f', 'a4dbb64f-a8be-4fa1-995c-4e50423c840f', '{"sub": "a4dbb64f-a8be-4fa1-995c-4e50423c840f", "email": "sys_admin_uat@example.com", "email_verified": false, "phone_verified": false}', 'email', '2026-10-12 05:06:18.00189+00', '2026-10-12 05:06:18.001948+00', '2026-10-12 05:06:18.001948+00', 'abac8943-ffdb-4531-8bb9-cfcc9eb98a7d'),
	('a79c19fe-394c-438d-843b-fab7e278edf2', 'a79c19fe-394c-438d-843b-fab7e278edf2', '{"sub": "a79c19fe-394c-438d-843b-fab7e278edf2", "email": "sec_staff_uat@example.com", "email_verified": false, "phone_verified": false}', 'email', '2026-10-12 05:06:18.231924+00', '2026-10-12 05:06:18.231988+00', '2026-10-12 05:06:18.231988+00', '72f512a1-5988-46f0-950c-c4d766445cec'),
	('8e397d0c-bd78-4276-95ae-f6d4ff6414b3', '8e397d0c-bd78-4276-95ae-f6d4ff6414b3', '{"sub": "8e397d0c-bd78-4276-95ae-f6d4ff6414b3", "email": "sec_lead_uat@example.com", "email_verified": false, "phone_verified": false}', 'email', '2026-10-12 05:06:18.451983+00', '2026-10-12 05:06:18.452028+00', '2026-10-12 05:06:18.452028+00', '632515aa-333a-44ed-99d2-83f4fdd11db4'),
	('a597343d-9fbe-48e2-92cf-bf4491ff3f27', 'a597343d-9fbe-48e2-92cf-bf4491ff3f27', '{"sub": "a597343d-9fbe-48e2-92cf-bf4491ff3f27", "email": "cckb_staff_uat@example.com", "email_verified": false, "phone_verified": false}', 'email', '2026-10-12 05:06:18.657952+00', '2026-10-12 05:06:18.657997+00', '2026-10-12 05:06:18.657997+00', 'f77568c2-410e-4895-b280-e1ceaf2f8789'),
	('0c190264-587e-4f61-8048-4dab2126fc9d', '0c190264-587e-4f61-8048-4dab2126fc9d', '{"sub": "0c190264-587e-4f61-8048-4dab2126fc9d", "email": "cckb_lead_uat@example.com", "email_verified": false, "phone_verified": false}', 'email', '2026-10-12 05:06:18.852165+00', '2026-10-12 05:06:18.852215+00', '2026-10-12 05:06:18.852215+00', '7db25bbc-dd72-44ef-82d7-fb41d9394594'),
	('e305264e-5ddc-4830-b877-c5f11e1b3cc0', 'e305264e-5ddc-4830-b877-c5f11e1b3cc0', '{"sub": "e305264e-5ddc-4830-b877-c5f11e1b3cc0", "email": "dis_staff_uat@example.com", "email_verified": false, "phone_verified": false}', 'email', '2026-10-12 05:06:19.044546+00', '2026-10-12 05:06:19.0446+00', '2026-10-12 05:06:19.0446+00', '1343aa9a-6b2a-412b-8900-c85477e0376b'),
	('60a7f530-23eb-478c-8062-97f58b6c114a', '60a7f530-23eb-478c-8062-97f58b6c114a', '{"sub": "60a7f530-23eb-478c-8062-97f58b6c114a", "email": "dis_lead_uat@example.com", "email_verified": false, "phone_verified": false}', 'email', '2026-10-12 05:06:19.22607+00', '2026-10-12 05:06:19.22612+00', '2026-10-12 05:06:19.22612+00', '60ab5b86-cc6b-477a-a670-0773af630493');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_recovery_code_sets; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_recovery_codes; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: scim_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: scim_users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: app_approval_policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_approval_policies" ("policy_code", "label", "request_permission_code", "approve_permission_code", "enforce_distinct_actor", "reason_required", "is_enabled", "notes") VALUES
	('AP01', 'Sửa giờ điện/chênh tiền SAU khi thu', 'reefer.session.amendment.request', 'reefer.session.amendment.approve', true, true, true, 'Giữ giao dịch đã thu; tạo điều chỉnh công nợ/hoàn trả, không ghi đè.'),
	('AP02', 'Sửa giờ điện TRƯỚC khi thu', 'reefer.session.time.edit_unpaid', NULL, false, true, true, 'Ghi trước/sau, lý do, giờ thực tế khác giờ nhập.'),
	('AP03', 'Điều chỉnh thời lượng điện trước thu', 'reefer.session.billable.override_unpaid', NULL, false, true, true, 'Lưu số tự tính làm tròn 15p và số sửa tay, hiện chênh lệch.'),
	('AP04', 'Sửa số cont SAU đã thu', 'container.number.correct', 'payment.post_correction.approve', false, true, true, 'Sửa mã ngay có audit/CCKB nhận cảnh báo. Chỉ sửa TIỀN chênh sau thu mới phải duyệt.'),
	('AP05', 'Chỉnh HÀNG/RỖNG SAU cont ra', 'container.cargo.post_exit.request', 'container.cargo.post_exit.approve', true, true, true, 'Không cấp sửa sau ra trực tiếp cho NV/An ninh.'),
	('AP06', 'CCKB cho xuất còn công nợ', 'exit.clearance.debt_exception', NULL, false, true, true, 'Không xóa công nợ; thời điểm An ninh xác nhận cont ra vẫn tính tiền lưu mới.'),
	('AP07', 'Có tiền lưu phát sinh ngay cửa ra', 'storage.payment.collect', 'exit.clearance.debt_exception', false, true, true, 'Cảnh báo/đồng bộ lại số phí lưu tại giờ thực ra, không khóa tiền trước khi ra.'),
	('AP08', 'Trạng thái PWA Đang cắm nhưng ngoài hiện trường đã rút', 'exit.reefer_state.exception', NULL, false, true, true, 'Không cho phép xuất khi cont thực tế vẫn đang nối điện; lưu giải trình khi dữ liệu app chưa cập nhật.'),
	('AP09', 'Thu hồi CCKB đã xác nhận cho ra', 'exit.clearance.revoke.request', 'exit.clearance.revoke.approve', true, true, true, 'Chỉ thu hồi trước khi xác nhận ra thực tế; sau ra dùng sửa lịch sử.'),
	('AP10', 'Bảng giá thay đổi', 'tariff.change.request', 'tariff.change.publish', true, true, true, 'Lưu phiên bản giá/hiệu lực; không thay tiền của lịch sử.'),
	('AP11', 'Hoàn tiền / miễn giảm', 'payment.refund.request', 'payment.refund.approve', true, true, false, 'Giai đoạn sau V1 (cờ tính năng tắt). Chưa cấp quyền cho bất kỳ vai trò nào.'),
	('AP12', 'Đăng nhập bốt An ninh dùng chung thiết bị', 'admin.users.manage', NULL, false, true, true, 'Ưu tiên đăng nhập cá nhân; nếu chế độ bốt thì phải xác minh người trực/phiên, không gắn mọi khoản thu vào email dùng chung.');


--
-- Data for Name: app_departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_departments" ("code", "display_name", "is_active") VALUES
	('AN_NINH', 'Bộ phận An ninh', true),
	('CCKB', 'Bộ phận Nghiệp vụ cổng cảng kho bãi', true),
	('DIEU_PHOI', 'Bộ phận Điều phối', true),
	('HE_THONG', 'Quản trị hệ thống', true),
	('KE_TOAN', 'Kế toán', true);


--
-- Data for Name: app_yards; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_yards" ("id", "name", "is_active") VALUES
	('fe83bb2b-833e-412c-aed4-b9a781a6decd', 'Bãi Sơn Cảng', true);


--
-- Data for Name: app_approval_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: app_audit_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_audit_events" ("id", "event_at", "actor_user_id", "action_code", "target_type", "target_id", "yard_id", "department_code", "before_data", "after_data", "reason", "request_id", "device_info") OVERRIDING SYSTEM VALUE VALUES
	(1, '2026-10-12 05:06:19.582825+00', NULL, 'system.role.assign', 'app_user_role_assignments', 'ff92fd04-a72c-4017-82b0-a8645fa1a20f', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', NULL, NULL, '{"id": "ff92fd04-a72c-4017-82b0-a8645fa1a20f", "user_id": "a4dbb64f-a8be-4fa1-995c-4e50423c840f", "yard_id": "fe83bb2b-833e-412c-aed4-b9a781a6decd", "is_active": true, "role_code": "SYS_ADMIN", "created_at": "2026-10-12T05:06:19.536143+00:00", "created_by": "a4dbb64f-a8be-4fa1-995c-4e50423c840f", "valid_from": "2026-10-12T05:06:19.536143+00:00", "valid_until": null, "department_code": null}', 'Gán vai trò người dùng', NULL, NULL),
	(2, '2026-10-12 05:06:19.958767+00', NULL, 'system.role.assign', 'app_user_role_assignments', 'ce4f39b1-23eb-4478-a97a-61c30b1ccbe3', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', 'AN_NINH', NULL, '{"id": "ce4f39b1-23eb-4478-a97a-61c30b1ccbe3", "user_id": "a79c19fe-394c-438d-843b-fab7e278edf2", "yard_id": "fe83bb2b-833e-412c-aed4-b9a781a6decd", "is_active": true, "role_code": "SEC_STAFF", "created_at": "2026-10-12T05:06:19.953525+00:00", "created_by": "a4dbb64f-a8be-4fa1-995c-4e50423c840f", "valid_from": "2026-10-12T05:06:19.953525+00:00", "valid_until": null, "department_code": "AN_NINH"}', 'Gán vai trò người dùng', NULL, NULL),
	(3, '2026-10-12 05:06:20.178308+00', NULL, 'system.role.assign', 'app_user_role_assignments', '3bef2587-32a5-4b9e-83b8-dcb364dacad1', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', 'AN_NINH', NULL, '{"id": "3bef2587-32a5-4b9e-83b8-dcb364dacad1", "user_id": "8e397d0c-bd78-4276-95ae-f6d4ff6414b3", "yard_id": "fe83bb2b-833e-412c-aed4-b9a781a6decd", "is_active": true, "role_code": "SEC_LEAD", "created_at": "2026-10-12T05:06:20.17539+00:00", "created_by": "a4dbb64f-a8be-4fa1-995c-4e50423c840f", "valid_from": "2026-10-12T05:06:20.17539+00:00", "valid_until": null, "department_code": "AN_NINH"}', 'Gán vai trò người dùng', NULL, NULL),
	(4, '2026-10-12 05:06:20.457775+00', NULL, 'system.role.assign', 'app_user_role_assignments', '2e39880e-c94d-4d8a-9aed-d1aa4971e44d', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', 'CCKB', NULL, '{"id": "2e39880e-c94d-4d8a-9aed-d1aa4971e44d", "user_id": "a597343d-9fbe-48e2-92cf-bf4491ff3f27", "yard_id": "fe83bb2b-833e-412c-aed4-b9a781a6decd", "is_active": true, "role_code": "PORT_STAFF", "created_at": "2026-10-12T05:06:20.453501+00:00", "created_by": "a4dbb64f-a8be-4fa1-995c-4e50423c840f", "valid_from": "2026-10-12T05:06:20.453501+00:00", "valid_until": null, "department_code": "CCKB"}', 'Gán vai trò người dùng', NULL, NULL),
	(5, '2026-10-12 05:06:20.654258+00', NULL, 'system.role.assign', 'app_user_role_assignments', 'b81e7d01-ebd6-4277-9140-8b1083008169', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', 'CCKB', NULL, '{"id": "b81e7d01-ebd6-4277-9140-8b1083008169", "user_id": "0c190264-587e-4f61-8048-4dab2126fc9d", "yard_id": "fe83bb2b-833e-412c-aed4-b9a781a6decd", "is_active": true, "role_code": "PORT_LEAD", "created_at": "2026-10-12T05:06:20.651875+00:00", "created_by": "a4dbb64f-a8be-4fa1-995c-4e50423c840f", "valid_from": "2026-10-12T05:06:20.651875+00:00", "valid_until": null, "department_code": "CCKB"}', 'Gán vai trò người dùng', NULL, NULL),
	(6, '2026-10-12 05:06:20.861008+00', NULL, 'system.role.assign', 'app_user_role_assignments', '80111396-5122-41ed-ae9f-7b8fe00be21c', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', 'DIEU_PHOI', NULL, '{"id": "80111396-5122-41ed-ae9f-7b8fe00be21c", "user_id": "e305264e-5ddc-4830-b877-c5f11e1b3cc0", "yard_id": "fe83bb2b-833e-412c-aed4-b9a781a6decd", "is_active": true, "role_code": "DIS_STAFF", "created_at": "2026-10-12T05:06:20.858744+00:00", "created_by": "a4dbb64f-a8be-4fa1-995c-4e50423c840f", "valid_from": "2026-10-12T05:06:20.858744+00:00", "valid_until": null, "department_code": "DIEU_PHOI"}', 'Gán vai trò người dùng', NULL, NULL),
	(7, '2026-10-12 05:06:21.081946+00', NULL, 'system.role.assign', 'app_user_role_assignments', 'db684fef-ce1a-45fb-829b-0f99f9a54c4d', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', 'DIEU_PHOI', NULL, '{"id": "db684fef-ce1a-45fb-829b-0f99f9a54c4d", "user_id": "60a7f530-23eb-478c-8062-97f58b6c114a", "yard_id": "fe83bb2b-833e-412c-aed4-b9a781a6decd", "is_active": true, "role_code": "DIS_LEAD", "created_at": "2026-10-12T05:06:21.080046+00:00", "created_by": "a4dbb64f-a8be-4fa1-995c-4e50423c840f", "valid_from": "2026-10-12T05:06:21.080046+00:00", "valid_until": null, "department_code": "DIEU_PHOI"}', 'Gán vai trò người dùng', NULL, NULL);


--
-- Data for Name: app_vehicle_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_vehicle_types" ("code", "display_name", "description", "allows_container", "default_ticket_amount", "is_active", "sort_order", "created_at", "updated_at") VALUES
	('CONT_LANH', 'Xe container lạnh', 'Xe đầu kéo kéo rơ-moóc chở container lạnh', true, 250000.00, true, 10, '2026-10-11 15:49:50.965671+00', '2026-10-11 15:49:50.965671+00'),
	('DAU_KEO', 'Xe đầu kéo không moóc', 'Xe đầu kéo vào bãi nhận hoặc trả container/moóc', true, 0.00, true, 20, '2026-10-11 15:49:50.965671+00', '2026-10-11 15:49:50.965671+00'),
	('XE_BO_4_CHAN', 'Xe bo 4 chân tải thùng', 'Xe tải thùng 4 chân vận chuyển hàng hóa nội địa', false, 200000.00, true, 30, '2026-10-11 15:49:50.965671+00', '2026-10-11 15:49:50.965671+00'),
	('XE_BO_3_CHAN', 'Xe bo 3 chân tải thùng', 'Xe tải thùng 3 chân vận chuyển hàng hóa nội địa', false, 200000.00, true, 40, '2026-10-11 15:49:50.965671+00', '2026-10-11 15:49:50.965671+00'),
	('XE_BO_8_TAN_2_CHAN', 'Xe bo 8 tấn 2 chân', 'Xe tải trung 2 chân trọng tải 8 tấn', false, 100000.00, true, 50, '2026-10-11 15:49:50.965671+00', '2026-10-11 15:49:50.965671+00'),
	('XE_BO_3_BANH', 'Xe bo 3 bánh nội bộ', 'Xe ba gác/ba bánh chở hàng nội bộ không biển số', false, 40000.00, true, 60, '2026-10-11 15:49:50.965671+00', '2026-10-11 15:49:50.965671+00'),
	('XE_SANG_TAI', 'Xe sang tải nội bộ', 'Xe phục vụ tác nghiệp sang tải hàng hóa trong bãi', false, 0.00, true, 70, '2026-10-11 15:49:50.965671+00', '2026-10-11 15:49:50.965671+00');


--
-- Data for Name: app_vehicle_visits; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: app_container_visits; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: app_container_number_changes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: app_feature_flags; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_feature_flags" ("feature_key", "display_name", "is_enabled") VALUES
	('CORE', 'Chức năng cốt lõi V1', true),
	('TICKET_AUTOPRINT', 'Tự động in vé giấy', false),
	('YARD_SLOT_MANAGEMENT', 'Quản lý vị trí khu/dãy/ô container', false),
	('CHARGE_DISCOUNT', 'Miễn/giảm và điều chỉnh phí', false),
	('REFUNDS', 'Hoàn tiền / hủy bút toán thu', false),
	('E_INVOICE', 'Phát hành hóa đơn điện tử', false);


--
-- Data for Name: app_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_permissions" ("code", "module", "display_name", "source_questions", "release_phase", "feature_key", "risk_level", "description", "is_active") VALUES
	('vehicle.visit.read', 'Cổng xe', 'Xem lượt xe trong bãi', 'Q01,Q03,Q25', 'V1', 'CORE', 'Thông thường', '', true),
	('vehicle.visit.create', 'Cổng xe', 'Tạo lượt xe/giờ vào', 'Q01', 'V1', 'CORE', 'Thông thường', '', true),
	('vehicle.visit.update_basic', 'Cổng xe', 'Sửa thông tin cơ bản của lượt xe', 'Q03', 'V1', 'CORE', 'Nhạy cảm', 'Biển số/loại xe; audit trước/sau; không tự viết lại số tiền đã thu.', true),
	('vehicle.visit.time_correction.request', 'Cổng xe', 'Yêu cầu sửa giờ vào sau khi phát sinh tiền', 'Q03', 'V1', 'CORE', 'Nhạy cảm', '', true),
	('vehicle.visit.time_correction.approve', 'Cổng xe', 'Duyệt sửa giờ vào sau khi phát sinh tiền', 'Q03', 'V1', 'CORE', 'Cao', 'Không tự duyệt yêu cầu do mình tạo; tách điều chỉnh phí.', true),
	('ticket.payment.collect', 'Vé vào', 'Ghi nhận thu tiền vé xe vào', 'Q02', 'V1', 'CORE', 'Tài chính', '', true),
	('ticket.lost_fee.collect', 'Vé vào', 'Ghi nhận và thu phạt mất vé', 'Q20', 'V1', 'CORE', 'Tài chính', '', true),
	('ticket.paper_number.adjust', 'Vé vào', 'Chỉnh số seri vé giấy / in vé', 'Q04', 'GĐ sau', 'TICKET_AUTOPRINT', 'Thông thường', 'Chưa xây theo quyết định V1; vẫn lưu thông tin số vé nếu có.', false),
	('vehicle.visit.exit_confirm', 'Cổng ra', 'Xác nhận lượt xe thực tế ra', 'Q25', 'V1', 'CORE', 'Cao', 'Bắt buộc server xác thực và chặn bấm đúp; không xác nhận offline.', true),
	('container.visit.read', 'Container', 'Xem lượt container trong bãi', 'Q05,Q06,Q18', 'V1', 'CORE', 'Thông thường', '', true),
	('container.visit.create', 'Container', 'Tạo lượt container vào và giờ vào', 'Q05', 'V1', 'CORE', 'Thông thường', '', true),
	('container.number.correct', 'Container', 'Sửa số container trên cùng ID lượt', 'Q06,Q35', 'V1', 'CORE', 'Cao', 'Ghi số cũ/mới, lý do, người sửa; tự cảnh báo CCKB; giữ nguyên charge/payment và ID.', true),
	('container.number.discrepancy.view', 'Container', 'Xem cảnh báo sai số container', 'Q35,Q36,Q39', 'V1', 'CORE', 'Thông thường', '', true),
	('container.number.discrepancy.sec_ack', 'Container', 'An ninh xác nhận đã báo CCKB', 'Q35,Q39', 'V1', 'CORE', 'Thông thường', '', true),
	('container.number.discrepancy.port_reconcile', 'Container', 'CCKB đối chiếu sai số và đóng cảnh báo', 'Q36,Q38,Q39', 'V1', 'CORE', 'Nhạy cảm', '', true),
	('container.number.evidence.attach', 'Chứng từ', 'Đính kèm ảnh/video xác minh số cont', 'Q37', 'V1', 'CORE', 'Thông thường', '', true),
	('container.visit.link_request', 'Container', 'Ghép yêu cầu dự kiến vào lượt cont vào', 'Q34', 'V1', 'CORE', 'Nhạy cảm', 'Chỉ xác nhận thủ công, không auto-ghép từ mã gần giống.', true),
	('container.cargo.read', 'Điều phối', 'Xem HÀNG/RỖNG', 'Q08,Q09', 'V1', 'CORE', 'Thông thường', '', true),
	('container.cargo.update', 'Điều phối', 'Cập nhật HÀNG/RỖNG khi còn trong bãi', 'Q08', 'V1', 'CORE', 'Thông thường', '', true),
	('container.cargo.post_exit.request', 'Điều phối', 'Đề nghị sửa HÀNG/RỖNG sau ra', 'Q09', 'V1', 'CORE', 'Nhạy cảm', '', true),
	('container.cargo.post_exit.approve', 'Điều phối', 'Duyệt sửa HÀNG/RỖNG sau ra', 'Q09', 'V1', 'CORE', 'Cao', '', true),
	('container.handling.record', 'Container', 'Ghi nhận hạ/xếp, vị trí khu/dãy/ô', 'Q07', 'GĐ sau', 'YARD_SLOT_MANAGEMENT', 'Thông thường', 'Không dùng sự kiện hạ/xếp làm căn cứ thu phí lưu container.', false),
	('reefer.request.read', 'Điện dự kiến', 'Xem yêu cầu điện dự kiến / đang xử lý', 'Q10,Q31,Q33', 'V1', 'CORE', 'Thông thường', '', true),
	('reefer.request.create', 'Điện dự kiến', 'Tạo phiếu yêu cầu cắm/rút (kể cả cont chưa vào)', 'Q10,Q31', 'V1', 'CORE', 'Thông thường', 'Một phiếu/cont, nhiều phiên; không tạo GIO_CONT_VAO khi phiếu là dự kiến.', true),
	('reefer.request.update', 'Điện dự kiến', 'Sửa thông tin yêu cầu dự kiến', 'Q32,Q36', 'V1', 'CORE', 'Thông thường', 'Sửa số cont/khách/loại yêu cầu có lịch sử và báo An ninh.', true),
	('reefer.request.cancel', 'Điện dự kiến', 'Hủy phiếu điện chưa thực hiện', 'Q32', 'V1', 'CORE', 'Nhạy cảm', 'Hủy mềm có lịch sử; không xóa phiếu đã phát sinh điện.', true),
	('reefer.request.alert.view', 'Điện dự kiến', 'Xem cảnh báo yêu cầu điện khi xe vào', 'Q33', 'V1', 'CORE', 'Thông thường', '', true),
	('reefer.request.match_confirm', 'Điện dự kiến', 'Xác nhận ghép phiếu dự kiến với cont thực', 'Q34', 'V1', 'CORE', 'Nhạy cảm', '', true),
	('reefer.field_work.note', 'Cắm điện', 'Ghi nhận thông tin An ninh báo cắm/rút ngoài hiện trường', 'Q11', 'V1', 'CORE', 'Thông thường', 'Quyền ghi chú/bằng chứng; KHÔNG biến việc bấm nút thành điều kiện bắt buộc để cắm/rút thực tế.', true),
	('reefer.session.read', 'Cắm điện', 'Xem phiên điện/trạng thái', 'Q12,Q13', 'V1', 'CORE', 'Thông thường', '', true),
	('reefer.session.actual_start.record', 'Cắm điện', 'CCKB nhập giờ cắm thực tế', 'Q12', 'V1', 'CORE', 'Thông thường', '', true),
	('reefer.session.actual_end.record', 'Cắm điện', 'CCKB nhập giờ rút thực tế', 'Q13', 'V1', 'CORE', 'Thông thường', '', true),
	('reefer.session.time.edit_unpaid', 'Cắm điện', 'CCKB sửa giờ cắm/rút trước khi thu', 'Q14', 'V1', 'CORE', 'Nhạy cảm', '', true),
	('reefer.session.billable.override_unpaid', 'Cắm điện', 'Chỉnh thời lượng tính tiền trước khi thu', 'Q14', 'V1', 'CORE', 'Tài chính', 'Tự làm tròn 15 phút mặc định; nếu chỉnh thì lưu số tính tự động, số điều chỉnh và lý do.', true),
	('reefer.session.amendment.request', 'Cắm điện', 'Đề nghị điều chỉnh giờ/tiền sau thu', 'Q15', 'V1', 'CORE', 'Tài chính', '', true),
	('reefer.session.amendment.approve', 'Cắm điện', 'Duyệt chênh lệch sau thu điện', 'Q16', 'V1', 'CORE', 'Cao', 'Tài khoản duyệt phải khác người đề nghị; không ghi đè tiền đã thu.', true),
	('reefer.payment.collect', 'Thanh toán', 'Thu tiền điện từng phiên hoặc tổng hợp', 'Q19', 'V1', 'CORE', 'Tài chính', '', true),
	('reefer.payment.partial_collect', 'Thanh toán', 'Thu một phần phí điện', 'Q19', 'V1', 'CORE', 'Tài chính', '', true),
	('storage.payment.collect', 'Thanh toán', 'An ninh tính/thu phí lưu tại giờ cont ra', 'Q18', 'V1', 'CORE', 'Tài chính', 'Chốt dựa GIO_CONT_VAO và GIO_CONT_RA thực tế, không khóa phí lúc rút điện.', true),
	('payment.bank_evidence.attach', 'Thanh toán', 'Đính kèm ảnh chứng từ thanh toán', 'Q02,Q19,Q21', 'V1', 'CORE', 'Thông thường', 'Quy định bắt buộc chứng từ có thể cấu hình riêng theo hình thức thu.', true),
	('payment.bank.reconcile', 'Thanh toán', 'Đối soát chuyển khoản theo bộ phận', 'Q21', 'V1', 'CORE', 'Tài chính', '', true),
	('payment.post_correction.request', 'Thanh toán', 'Yêu cầu xử lý chênh lệch khi sửa mã cont đã thu', 'Q38', 'V1', 'CORE', 'Tài chính', '', true),
	('payment.post_correction.approve', 'Thanh toán', 'Duyệt chênh lệch tiền do sửa số cont', 'Q38', 'V1', 'CORE', 'Cao', '', true),
	('charge.adjust.request', 'Thanh toán', 'Gửi đề nghị miễn/giảm/điều chỉnh tiền', 'Q22', 'GĐ sau', 'CHARGE_DISCOUNT', 'Tài chính', '', false),
	('charge.adjust.approve', 'Thanh toán', 'Duyệt miễn/giảm/điều chỉnh tiền', 'Q22', 'GĐ sau', 'CHARGE_DISCOUNT', 'Cao', '', false),
	('payment.refund.request', 'Thanh toán', 'Đề nghị hoàn tiền', 'Q23', 'GĐ sau', 'REFUNDS', 'Tài chính', '', false),
	('payment.refund.approve', 'Thanh toán', 'Duyệt hoàn tiền / hủy bút toán', 'Q23', 'GĐ sau', 'REFUNDS', 'Cao', '', false),
	('exit.clearance.read', 'Cổng ra', 'Xem tình trạng tài chính và cho ra', 'Q24,Q25', 'V1', 'CORE', 'Thông thường', '', true),
	('exit.clearance.issue', 'Cổng ra', 'CCKB xác nhận điều kiện tài chính', 'Q24', 'V1', 'CORE', 'Cao', 'Xác nhận điện/công nợ đã biết; KHÔNG khóa phí lưu container.', true),
	('exit.clearance.debt_exception', 'Cổng ra', 'CCKB xác nhận cho ra còn khoản chưa thu', 'Q24', 'V1', 'CORE', 'Cao', 'Bắt buộc lý do, hiện cảnh báo và giữ khoản còn nợ; phải kiểm tra lại nếu phí lưu mới phát sinh.', true),
	('exit.clearance.revoke.request', 'Cổng ra', 'Đề nghị thu hồi chấp thuận xuất trước khi xe ra', 'Q26', 'V1', 'CORE', 'Nhạy cảm', '', true),
	('exit.clearance.revoke.approve', 'Cổng ra', 'Thu hồi chấp thuận cho ra trước khi thực xuất', 'Q26', 'V1', 'CORE', 'Cao', '', true),
	('exit.actual.confirm', 'Cổng ra', 'An ninh xác nhận cont/xe ra thật', 'Q25', 'V1', 'CORE', 'Cao', 'Server transaction và idempotency; không được tự hoàn tất nếu offline.', true),
	('exit.reefer_state.exception', 'Cổng ra', 'CCKB ghi ngoại lệ trạng thái điện chưa cập nhật', 'Q24', 'V1', 'CORE', 'Cao', 'Phải có An ninh xác minh ngoài hiện trường đã rút điện, không được cho cont rời bãi khi còn kết nối điện thực tế.', true),
	('report.revenue.read', 'Báo cáo', 'Xem doanh thu và khoản thu theo phạm vi', 'Q29', 'V1', 'CORE', 'Tài chính', '', true),
	('report.revenue.export', 'Báo cáo', 'Xuất báo cáo doanh thu theo bộ phận', 'Q30', 'V1', 'CORE', 'Tài chính', '', true),
	('audit.read', 'Giám sát', 'Xem lịch sử thao tác thuộc phạm vi', 'Q28', 'V1', 'CORE', 'Thông thường', '', true),
	('audit.export_all', 'Giám sát', 'Xuất nhật ký kiểm toán toàn hệ thống', 'Q30', 'V1', 'CORE', 'Cao', '', true),
	('tariff.read', 'Bảng giá', 'Xem giá dịch vụ theo hiệu lực', 'Q17', 'V1', 'CORE', 'Thông thường', '', true),
	('tariff.change.request', 'Bảng giá', 'Gửi đề nghị thay đổi bảng giá', 'Q17', 'V1', 'CORE', 'Tài chính', '', true),
	('tariff.change.publish', 'Bảng giá', 'Ban hành mức giá và ngày hiệu lực', 'Q17', 'V1', 'CORE', 'Cao', 'Thay đổi giá qua bảng tariff_versions, không sửa code/giá lịch sử.', true),
	('admin.users.manage', 'Quản trị', 'Tạo/khóa user và gán role theo phạm vi', 'Q27', 'V1', 'CORE', 'Cao', '', true),
	('admin.roles.manage', 'Quản trị', 'Thêm/sửa tên vai trò và thành phần vai trò', 'Q27', 'V1', 'CORE', 'Cao', 'Vai trò tùy biến nhưng không thể tạo tính năng mới chỉ bằng cách đặt role.', true),
	('admin.role_permissions.manage', 'Quản trị', 'Cấp/thu hồi quyền của vai trò', 'Q27', 'V1', 'CORE', 'Cao', 'Cấm tự động cho quyền cao hơn do seed chủ sở hữu quy định; audit và quyền bootstrap.', true),
	('admin.billing_settings.manage', 'Quản trị', 'Quản lý tham số tính phí và chức năng mở rộng', 'Q17', 'V1', 'CORE', 'Cao', '', true),
	('admin.legacy_correct', 'Quản trị', 'Sửa dữ liệu nhập lịch sử AppSheet có audit', 'Q03,Q06', 'V1', 'CORE', 'Cao', 'Không chỉnh sửa trực tiếp DB; phải ghi đối chiếu lịch sử và không tạo nợ legacy chưa xác minh.', true),
	('accounting.invoice.prepare', 'Hóa đơn', 'Nhập dữ liệu hóa đơn từ bộ phận Kế toán', '', 'GĐ sau', 'E_INVOICE', 'Nhạy cảm', '', false);


--
-- Data for Name: app_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_roles" ("code", "display_name", "department_code", "seniority", "is_active", "release_phase", "description") VALUES
	('SEC_STAFF', 'Nhân viên An ninh', 'AN_NINH', 'Nhân viên', true, 'V1', 'Kiểm soát cổng, thu vé/phí lưu, ghi xe/cont ra, sửa mã cont có nhật ký.'),
	('SEC_LEAD', 'Trưởng bộ phận An ninh', 'AN_NINH', 'Trưởng bộ phận', true, 'V1', 'Toàn quyền nghiệp vụ An ninh, xem thu ca/bộ phận, xử lý ngoại lệ.'),
	('PORT_STAFF', 'Nhân viên Cổng cảng kho bãi', 'CCKB', 'Nhân viên', true, 'V1', 'Điện dự kiến, nhập/sửa giờ, thu điện, xác nhận tài chính/ngoại lệ có lý do.'),
	('PORT_LEAD', 'Trưởng bộ phận Cổng cảng kho bãi', 'CCKB', 'Trưởng bộ phận', true, 'V1', 'Duyệt điều chỉnh tiền sau thu, xem đối soát, hỗ trợ nhân viên CCKB.'),
	('DIS_STAFF', 'Nhân viên Điều phối', 'DIEU_PHOI', 'Nhân viên', true, 'V1', 'Cập nhật tình trạng container HÀNG/RỖNG trong bãi.'),
	('DIS_LEAD', 'Trưởng bộ phận Điều phối', 'DIEU_PHOI', 'Trưởng bộ phận', true, 'V1', 'Xử lý thay đổi HÀNG/RỖNG sau khi cont đã ra; xem audit BP.'),
	('SYS_ADMIN', 'Quản trị hệ thống', 'HE_THONG', 'Quản trị', true, 'V1', 'Quản trị tài khoản, gán quyền, bảng giá, bảo trì và ngoại lệ có audit.'),
	('ACCOUNTING_FUTURE', 'Kế toán (dự phòng)', 'KE_TOAN', 'Chuyên môn', false, 'GĐ sau', 'Chưa bật trong V1; lưu thông tin hóa đơn, mở rộng khi có nghiệp vụ Kế toán.');


--
-- Data for Name: app_role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_role_permissions" ("role_code", "permission_code", "scope", "is_enabled") VALUES
	('SEC_STAFF', 'vehicle.visit.read', 'YARD', true),
	('SEC_LEAD', 'vehicle.visit.read', 'YARD', true),
	('PORT_STAFF', 'vehicle.visit.read', 'YARD', true),
	('PORT_LEAD', 'vehicle.visit.read', 'YARD', true),
	('DIS_STAFF', 'vehicle.visit.read', 'YARD', true),
	('DIS_LEAD', 'vehicle.visit.read', 'YARD', true),
	('SYS_ADMIN', 'vehicle.visit.read', 'ALL', true),
	('SEC_STAFF', 'vehicle.visit.create', 'YARD', true),
	('SEC_LEAD', 'vehicle.visit.create', 'YARD', true),
	('SYS_ADMIN', 'vehicle.visit.create', 'ALL', true),
	('SEC_STAFF', 'vehicle.visit.update_basic', 'YARD', true),
	('SEC_LEAD', 'vehicle.visit.update_basic', 'YARD', true),
	('SYS_ADMIN', 'vehicle.visit.update_basic', 'ALL', true),
	('SEC_STAFF', 'vehicle.visit.time_correction.request', 'YARD', true),
	('SEC_LEAD', 'vehicle.visit.time_correction.request', 'YARD', true),
	('SYS_ADMIN', 'vehicle.visit.time_correction.request', 'ALL', true),
	('SEC_LEAD', 'vehicle.visit.time_correction.approve', 'DEPARTMENT', true),
	('SYS_ADMIN', 'vehicle.visit.time_correction.approve', 'ALL', true),
	('SEC_STAFF', 'ticket.payment.collect', 'YARD', true),
	('SEC_LEAD', 'ticket.payment.collect', 'YARD', true),
	('SYS_ADMIN', 'ticket.payment.collect', 'ALL', true),
	('SEC_STAFF', 'ticket.lost_fee.collect', 'YARD', true),
	('SEC_LEAD', 'ticket.lost_fee.collect', 'YARD', true),
	('SYS_ADMIN', 'ticket.lost_fee.collect', 'ALL', true),
	('SEC_STAFF', 'vehicle.visit.exit_confirm', 'YARD', true),
	('SEC_LEAD', 'vehicle.visit.exit_confirm', 'YARD', true),
	('SYS_ADMIN', 'vehicle.visit.exit_confirm', 'ALL', true),
	('SEC_STAFF', 'container.visit.read', 'YARD', true),
	('SEC_LEAD', 'container.visit.read', 'YARD', true),
	('PORT_STAFF', 'container.visit.read', 'YARD', true),
	('PORT_LEAD', 'container.visit.read', 'YARD', true),
	('DIS_STAFF', 'container.visit.read', 'YARD', true),
	('DIS_LEAD', 'container.visit.read', 'YARD', true),
	('SYS_ADMIN', 'container.visit.read', 'ALL', true),
	('SEC_STAFF', 'container.visit.create', 'YARD', true),
	('SEC_LEAD', 'container.visit.create', 'YARD', true),
	('SYS_ADMIN', 'container.visit.create', 'ALL', true),
	('SEC_STAFF', 'container.number.correct', 'YARD', true),
	('SEC_LEAD', 'container.number.correct', 'YARD', true),
	('SYS_ADMIN', 'container.number.correct', 'ALL', true),
	('SEC_STAFF', 'container.number.discrepancy.view', 'YARD', true),
	('SEC_LEAD', 'container.number.discrepancy.view', 'YARD', true),
	('PORT_STAFF', 'container.number.discrepancy.view', 'YARD', true),
	('PORT_LEAD', 'container.number.discrepancy.view', 'YARD', true),
	('SYS_ADMIN', 'container.number.discrepancy.view', 'ALL', true),
	('SEC_STAFF', 'container.number.discrepancy.sec_ack', 'YARD', true),
	('SEC_LEAD', 'container.number.discrepancy.sec_ack', 'YARD', true),
	('SYS_ADMIN', 'container.number.discrepancy.sec_ack', 'ALL', true),
	('PORT_STAFF', 'container.number.discrepancy.port_reconcile', 'YARD', true),
	('PORT_LEAD', 'container.number.discrepancy.port_reconcile', 'YARD', true),
	('SYS_ADMIN', 'container.number.discrepancy.port_reconcile', 'ALL', true),
	('SEC_STAFF', 'container.number.evidence.attach', 'YARD', true),
	('SEC_LEAD', 'container.number.evidence.attach', 'YARD', true),
	('PORT_STAFF', 'container.number.evidence.attach', 'YARD', true),
	('PORT_LEAD', 'container.number.evidence.attach', 'YARD', true),
	('SYS_ADMIN', 'container.number.evidence.attach', 'ALL', true),
	('SEC_STAFF', 'container.visit.link_request', 'YARD', true),
	('SEC_LEAD', 'container.visit.link_request', 'YARD', true),
	('PORT_STAFF', 'container.visit.link_request', 'YARD', true),
	('PORT_LEAD', 'container.visit.link_request', 'YARD', true),
	('SYS_ADMIN', 'container.visit.link_request', 'ALL', true),
	('SEC_STAFF', 'container.cargo.read', 'YARD', true),
	('SEC_LEAD', 'container.cargo.read', 'YARD', true),
	('PORT_STAFF', 'container.cargo.read', 'YARD', true),
	('PORT_LEAD', 'container.cargo.read', 'YARD', true),
	('DIS_STAFF', 'container.cargo.read', 'YARD', true),
	('DIS_LEAD', 'container.cargo.read', 'YARD', true),
	('SYS_ADMIN', 'container.cargo.read', 'ALL', true),
	('DIS_STAFF', 'container.cargo.update', 'YARD', true),
	('DIS_LEAD', 'container.cargo.update', 'YARD', true),
	('SYS_ADMIN', 'container.cargo.update', 'ALL', true),
	('DIS_STAFF', 'container.cargo.post_exit.request', 'YARD', true),
	('DIS_LEAD', 'container.cargo.post_exit.request', 'YARD', true),
	('SYS_ADMIN', 'container.cargo.post_exit.request', 'ALL', true),
	('DIS_LEAD', 'container.cargo.post_exit.approve', 'DEPARTMENT', true),
	('SYS_ADMIN', 'container.cargo.post_exit.approve', 'ALL', true),
	('SEC_STAFF', 'reefer.request.read', 'YARD', true),
	('SEC_LEAD', 'reefer.request.read', 'YARD', true),
	('PORT_STAFF', 'reefer.request.read', 'YARD', true),
	('PORT_LEAD', 'reefer.request.read', 'YARD', true),
	('DIS_STAFF', 'reefer.request.read', 'YARD', true),
	('DIS_LEAD', 'reefer.request.read', 'YARD', true),
	('SYS_ADMIN', 'reefer.request.read', 'ALL', true),
	('PORT_STAFF', 'reefer.request.create', 'YARD', true),
	('PORT_LEAD', 'reefer.request.create', 'YARD', true),
	('SYS_ADMIN', 'reefer.request.create', 'ALL', true),
	('PORT_STAFF', 'reefer.request.update', 'YARD', true),
	('PORT_LEAD', 'reefer.request.update', 'YARD', true),
	('SYS_ADMIN', 'reefer.request.update', 'ALL', true),
	('PORT_STAFF', 'reefer.request.cancel', 'YARD', true),
	('PORT_LEAD', 'reefer.request.cancel', 'YARD', true),
	('SYS_ADMIN', 'reefer.request.cancel', 'ALL', true),
	('SEC_STAFF', 'reefer.request.alert.view', 'YARD', true),
	('SEC_LEAD', 'reefer.request.alert.view', 'YARD', true),
	('PORT_STAFF', 'reefer.request.alert.view', 'YARD', true),
	('PORT_LEAD', 'reefer.request.alert.view', 'YARD', true),
	('SYS_ADMIN', 'reefer.request.alert.view', 'ALL', true),
	('SEC_STAFF', 'reefer.request.match_confirm', 'YARD', true),
	('SEC_LEAD', 'reefer.request.match_confirm', 'YARD', true),
	('PORT_STAFF', 'reefer.request.match_confirm', 'YARD', true),
	('PORT_LEAD', 'reefer.request.match_confirm', 'YARD', true),
	('SYS_ADMIN', 'reefer.request.match_confirm', 'ALL', true),
	('SEC_STAFF', 'reefer.field_work.note', 'YARD', true),
	('SEC_LEAD', 'reefer.field_work.note', 'YARD', true),
	('PORT_STAFF', 'reefer.field_work.note', 'YARD', true),
	('PORT_LEAD', 'reefer.field_work.note', 'YARD', true),
	('SYS_ADMIN', 'reefer.field_work.note', 'ALL', true),
	('SEC_STAFF', 'reefer.session.read', 'YARD', true),
	('SEC_LEAD', 'reefer.session.read', 'YARD', true),
	('PORT_STAFF', 'reefer.session.read', 'YARD', true),
	('PORT_LEAD', 'reefer.session.read', 'YARD', true),
	('DIS_STAFF', 'reefer.session.read', 'YARD', true),
	('DIS_LEAD', 'reefer.session.read', 'YARD', true),
	('SYS_ADMIN', 'reefer.session.read', 'ALL', true),
	('PORT_STAFF', 'reefer.session.actual_start.record', 'YARD', true),
	('PORT_LEAD', 'reefer.session.actual_start.record', 'YARD', true),
	('SYS_ADMIN', 'reefer.session.actual_start.record', 'ALL', true),
	('PORT_STAFF', 'reefer.session.actual_end.record', 'YARD', true),
	('PORT_LEAD', 'reefer.session.actual_end.record', 'YARD', true),
	('SYS_ADMIN', 'reefer.session.actual_end.record', 'ALL', true),
	('PORT_STAFF', 'reefer.session.time.edit_unpaid', 'YARD', true),
	('PORT_LEAD', 'reefer.session.time.edit_unpaid', 'YARD', true),
	('SYS_ADMIN', 'reefer.session.time.edit_unpaid', 'ALL', true),
	('PORT_STAFF', 'reefer.session.billable.override_unpaid', 'YARD', true),
	('PORT_LEAD', 'reefer.session.billable.override_unpaid', 'YARD', true),
	('SYS_ADMIN', 'reefer.session.billable.override_unpaid', 'ALL', true),
	('PORT_STAFF', 'reefer.session.amendment.request', 'YARD', true),
	('PORT_LEAD', 'reefer.session.amendment.request', 'YARD', true),
	('SYS_ADMIN', 'reefer.session.amendment.request', 'ALL', true),
	('PORT_LEAD', 'reefer.session.amendment.approve', 'DEPARTMENT', true),
	('SYS_ADMIN', 'reefer.session.amendment.approve', 'ALL', true),
	('PORT_STAFF', 'reefer.payment.collect', 'YARD', true),
	('PORT_LEAD', 'reefer.payment.collect', 'YARD', true),
	('SYS_ADMIN', 'reefer.payment.collect', 'ALL', true),
	('PORT_STAFF', 'reefer.payment.partial_collect', 'YARD', true),
	('PORT_LEAD', 'reefer.payment.partial_collect', 'YARD', true),
	('SYS_ADMIN', 'reefer.payment.partial_collect', 'ALL', true),
	('SEC_STAFF', 'storage.payment.collect', 'YARD', true),
	('SEC_LEAD', 'storage.payment.collect', 'YARD', true),
	('SYS_ADMIN', 'storage.payment.collect', 'ALL', true),
	('SEC_STAFF', 'payment.bank_evidence.attach', 'YARD', true),
	('SEC_LEAD', 'payment.bank_evidence.attach', 'YARD', true),
	('PORT_STAFF', 'payment.bank_evidence.attach', 'YARD', true),
	('PORT_LEAD', 'payment.bank_evidence.attach', 'YARD', true),
	('SYS_ADMIN', 'payment.bank_evidence.attach', 'ALL', true),
	('SEC_LEAD', 'payment.bank.reconcile', 'DEPARTMENT', true),
	('PORT_LEAD', 'payment.bank.reconcile', 'DEPARTMENT', true),
	('SYS_ADMIN', 'payment.bank.reconcile', 'ALL', true),
	('PORT_STAFF', 'payment.post_correction.request', 'YARD', true),
	('PORT_LEAD', 'payment.post_correction.request', 'YARD', true),
	('SEC_LEAD', 'payment.post_correction.request', 'YARD', true),
	('SYS_ADMIN', 'payment.post_correction.request', 'ALL', true),
	('PORT_LEAD', 'payment.post_correction.approve', 'DEPARTMENT', true),
	('SYS_ADMIN', 'payment.post_correction.approve', 'ALL', true),
	('SEC_STAFF', 'exit.clearance.read', 'YARD', true),
	('SEC_LEAD', 'exit.clearance.read', 'YARD', true),
	('PORT_STAFF', 'exit.clearance.read', 'YARD', true),
	('PORT_LEAD', 'exit.clearance.read', 'YARD', true),
	('DIS_STAFF', 'exit.clearance.read', 'YARD', true),
	('DIS_LEAD', 'exit.clearance.read', 'YARD', true),
	('SYS_ADMIN', 'exit.clearance.read', 'ALL', true),
	('PORT_STAFF', 'exit.clearance.issue', 'YARD', true),
	('PORT_LEAD', 'exit.clearance.issue', 'YARD', true),
	('SYS_ADMIN', 'exit.clearance.issue', 'ALL', true),
	('PORT_STAFF', 'exit.clearance.debt_exception', 'YARD', true),
	('PORT_LEAD', 'exit.clearance.debt_exception', 'YARD', true),
	('SYS_ADMIN', 'exit.clearance.debt_exception', 'ALL', true),
	('PORT_STAFF', 'exit.clearance.revoke.request', 'YARD', true),
	('PORT_LEAD', 'exit.clearance.revoke.request', 'YARD', true),
	('SYS_ADMIN', 'exit.clearance.revoke.request', 'ALL', true),
	('PORT_LEAD', 'exit.clearance.revoke.approve', 'DEPARTMENT', true),
	('SYS_ADMIN', 'exit.clearance.revoke.approve', 'ALL', true),
	('SEC_STAFF', 'exit.actual.confirm', 'YARD', true),
	('SEC_LEAD', 'exit.actual.confirm', 'YARD', true),
	('SYS_ADMIN', 'exit.actual.confirm', 'ALL', true),
	('PORT_STAFF', 'exit.reefer_state.exception', 'YARD', true),
	('PORT_LEAD', 'exit.reefer_state.exception', 'YARD', true),
	('SYS_ADMIN', 'exit.reefer_state.exception', 'ALL', true),
	('SEC_STAFF', 'report.revenue.read', 'SELF', true),
	('SEC_LEAD', 'report.revenue.read', 'DEPARTMENT', true),
	('PORT_STAFF', 'report.revenue.read', 'SELF', true),
	('PORT_LEAD', 'report.revenue.read', 'DEPARTMENT', true),
	('SYS_ADMIN', 'report.revenue.read', 'ALL', true),
	('SEC_LEAD', 'report.revenue.export', 'DEPARTMENT', true),
	('PORT_LEAD', 'report.revenue.export', 'DEPARTMENT', true),
	('SYS_ADMIN', 'report.revenue.export', 'ALL', true),
	('SEC_LEAD', 'audit.read', 'DEPARTMENT', true),
	('PORT_LEAD', 'audit.read', 'DEPARTMENT', true),
	('DIS_LEAD', 'audit.read', 'DEPARTMENT', true),
	('SYS_ADMIN', 'audit.read', 'ALL', true),
	('SYS_ADMIN', 'audit.export_all', 'ALL', true),
	('SEC_STAFF', 'tariff.read', 'YARD', true),
	('SEC_LEAD', 'tariff.read', 'YARD', true),
	('PORT_STAFF', 'tariff.read', 'YARD', true),
	('PORT_LEAD', 'tariff.read', 'YARD', true),
	('DIS_STAFF', 'tariff.read', 'YARD', true),
	('DIS_LEAD', 'tariff.read', 'YARD', true),
	('SYS_ADMIN', 'tariff.read', 'ALL', true),
	('PORT_LEAD', 'tariff.change.request', 'DEPARTMENT', true),
	('SYS_ADMIN', 'tariff.change.request', 'ALL', true),
	('SYS_ADMIN', 'tariff.change.publish', 'ALL', true),
	('SYS_ADMIN', 'admin.users.manage', 'ALL', true),
	('SYS_ADMIN', 'admin.roles.manage', 'ALL', true),
	('SYS_ADMIN', 'admin.role_permissions.manage', 'ALL', true),
	('SYS_ADMIN', 'admin.billing_settings.manage', 'ALL', true),
	('SYS_ADMIN', 'admin.legacy_correct', 'ALL', true);


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_settings" ("setting_key", "setting_value", "setting_type", "decision_status", "notes", "updated_at") VALUES
	('REEFER_BILLING_INTERVAL_MINUTES', '15', 'Quy tắc điện', 'Đã chốt', 'Mỗi phiên làm tròn lên bội số 15 phút.', '2026-10-11 11:57:51.156284+00'),
	('REEFER_HOURLY_RATE_VND', '100000', 'Bảng giá', 'Đã chốt', 'Đơn vị giờ, áp dụng cho cả DIEN_CONT_GIO và DIEN_CONT_LIEN_TUC.', '2026-10-11 11:57:51.156284+00'),
	('STORAGE_NIGHT_FEE_VND', '100000', 'Bảng giá', 'Đã chốt', '100.000đ/container/đêm, khung 22:00-06:00.', '2026-10-11 11:57:51.156284+00'),
	('STORAGE_FREE_INITIAL_NIGHTS', '1', 'Quy tắc lưu', 'Đã chốt', 'Miễn phí đêm lưu đầu tiên.', '2026-10-11 11:57:51.156284+00'),
	('STORAGE_CUTOFF_START', '"22:00:00"', 'Quy tắc lưu', 'Đã chốt', 'Bắt đầu khung tính đêm Asia/Ho_Chi_Minh.', '2026-10-11 11:57:51.156284+00'),
	('STORAGE_CUTOFF_END', '"06:00:00"', 'Quy tắc lưu', 'Đã chốt', 'Kết thúc khung tính đêm Asia/Ho_Chi_Minh.', '2026-10-11 11:57:51.156284+00'),
	('OFFLINE_GATE_EXIT_ALLOWED', 'false', 'An toàn', 'Đã chốt', 'Không tự xác nhận thành công ra cổng khi mất kết nối mạng.', '2026-10-11 11:57:51.156284+00'),
	('AUTO_MERGE_CONTAINER_ALLOWED', 'false', 'An toàn', 'Đã chốt', 'Cấm tự động gộp số container theo 7 số cuối hoặc check-digit.', '2026-10-11 11:57:51.156284+00');


--
-- Data for Name: app_user_role_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_user_role_assignments" ("id", "user_id", "role_code", "yard_id", "department_code", "valid_from", "valid_until", "is_active", "created_by", "created_at") VALUES
	('ff92fd04-a72c-4017-82b0-a8645fa1a20f', 'a4dbb64f-a8be-4fa1-995c-4e50423c840f', 'SYS_ADMIN', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', NULL, '2026-10-12 05:06:19.536143+00', NULL, true, 'a4dbb64f-a8be-4fa1-995c-4e50423c840f', '2026-10-12 05:06:19.536143+00'),
	('ce4f39b1-23eb-4478-a97a-61c30b1ccbe3', 'a79c19fe-394c-438d-843b-fab7e278edf2', 'SEC_STAFF', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', 'AN_NINH', '2026-10-12 05:06:19.953525+00', NULL, true, 'a4dbb64f-a8be-4fa1-995c-4e50423c840f', '2026-10-12 05:06:19.953525+00'),
	('3bef2587-32a5-4b9e-83b8-dcb364dacad1', '8e397d0c-bd78-4276-95ae-f6d4ff6414b3', 'SEC_LEAD', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', 'AN_NINH', '2026-10-12 05:06:20.17539+00', NULL, true, 'a4dbb64f-a8be-4fa1-995c-4e50423c840f', '2026-10-12 05:06:20.17539+00'),
	('2e39880e-c94d-4d8a-9aed-d1aa4971e44d', 'a597343d-9fbe-48e2-92cf-bf4491ff3f27', 'PORT_STAFF', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', 'CCKB', '2026-10-12 05:06:20.453501+00', NULL, true, 'a4dbb64f-a8be-4fa1-995c-4e50423c840f', '2026-10-12 05:06:20.453501+00'),
	('b81e7d01-ebd6-4277-9140-8b1083008169', '0c190264-587e-4f61-8048-4dab2126fc9d', 'PORT_LEAD', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', 'CCKB', '2026-10-12 05:06:20.651875+00', NULL, true, 'a4dbb64f-a8be-4fa1-995c-4e50423c840f', '2026-10-12 05:06:20.651875+00'),
	('80111396-5122-41ed-ae9f-7b8fe00be21c', 'e305264e-5ddc-4830-b877-c5f11e1b3cc0', 'DIS_STAFF', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', 'DIEU_PHOI', '2026-10-12 05:06:20.858744+00', NULL, true, 'a4dbb64f-a8be-4fa1-995c-4e50423c840f', '2026-10-12 05:06:20.858744+00'),
	('db684fef-ce1a-45fb-829b-0f99f9a54c4d', '60a7f530-23eb-478c-8062-97f58b6c114a', 'DIS_LEAD', 'fe83bb2b-833e-412c-aed4-b9a781a6decd', 'DIEU_PHOI', '2026-10-12 05:06:21.080046+00', NULL, true, 'a4dbb64f-a8be-4fa1-995c-4e50423c840f', '2026-10-12 05:06:21.080046+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 39, true);


--
-- Name: app_audit_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."app_audit_events_id_seq"', 7, true);


--
-- Name: app_container_number_changes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."app_container_number_changes_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict VhqBZWHuhVWlNoJuyc22vtOqv5da2KGzMb2xbgdRbKDfd8vBb4KGWVBMPMbxF2Z

RESET ALL;
