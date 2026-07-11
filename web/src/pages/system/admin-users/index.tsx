/**
 * 用户管理 - 使用 CrudTable 重构
 */
import type { ProColumns } from '@ant-design/pro-components';
import { ProFormText, ProFormSwitch, ProFormSelect } from '@ant-design/pro-components';
import { Avatar, Tag, Space, Form } from 'antd';
import React, { useCallback, useState, useEffect } from 'react';
import AvatarUpload from '@/components/AvatarUpload';
import CrudTable from '@/components/CrudTable';
import { createCrudService } from '@/services/crud';
import { getAllAdminRoles } from '@/services/system/admin-role';
import { uploadAvatar } from '@/services/auth/profile';
import { MIN_PASSWORD_LENGTH } from '@/utils/validation';

// 类型定义
interface AdminUser {
  id: number;
  username: string;
  name: string;
  avatar: string;
  enabled: boolean;
  roles?: { id: number; name: string }[];
  created_at: string;
}

// CRUD 服务
const userService = createCrudService<AdminUser>('/admin-users');

// 列配置
const columns: ProColumns<AdminUser>[] = [
  { title: 'ID', dataIndex: 'id', width: 80, search: false },
  { title: '用户名', dataIndex: 'username', width: 150 },
  {
    title: '头像',
    dataIndex: 'avatar',
    width: 80,
    search: false,
    render: (_, r) => <Avatar src={r.avatar} alt={`${r.name || r.username}的头像`} size={40} />,
  },
  { title: '姓名', dataIndex: 'name', width: 150 },
  {
    title: '角色',
    dataIndex: 'role_ids',
    valueType: 'select',
    fieldProps: { mode: 'multiple' },
    request: async () => {
      const res = await getAllAdminRoles();
      return (res.data || []).map((r: any) => ({ label: r.name, value: r.id }));
    },
    width: 200,
    render: (_, r) => <Space size={4}>{r.roles?.map((role) => <Tag key={role.id} color="blue">{role.name}</Tag>)}</Space>,
  },
  {
    title: '状态',
    dataIndex: 'enabled',
    width: 100,
    valueType: 'select',
    valueEnum: { true: { text: '启用', status: 'Success' }, false: { text: '禁用', status: 'Default' } },
    render: (_, r) => <Tag color={r.enabled ? 'green' : 'red'}>{r.enabled ? '启用' : '禁用'}</Tag>,
  },
  { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 180, search: false, sorter: true },
];

// 表单内容组件
const FormContent: React.FC<{ record?: AdminUser }> = ({ record }) => {
  const isEdit = !!record;
  const [avatarUrl, setAvatarUrl] = useState('');
  const form = Form.useFormInstance();

  useEffect(() => {
    const initialAvatar = record?.avatar || `https://api.dicebear.com/9.x/thumbs/png?seed=${Math.random()}`;
    setAvatarUrl(initialAvatar);
    form.setFieldValue('avatar', initialAvatar);
  }, [form, record]);

  // handleAvatarUpload 上传头像并返回组件需要的新地址。
  const handleAvatarUpload = useCallback(async (file: File) => {
    const response = await uploadAvatar(file);
    if (response.code !== 0 || !response.data?.url) {
      // 接口未返回有效地址时阻止表单写入。
      throw new Error(response.msg || '头像上传失败');
    }
    return response.data.url;
  }, []);

  // handleAvatarChange 同步头像预览和隐藏表单字段。
  const handleAvatarChange = useCallback((url: string) => {
    setAvatarUrl(url);
    form.setFieldValue('avatar', url);
  }, [form]);

  return (
    <>
      <ProFormText
        name="username"
        label="用户名"
        placeholder="请输入用户名"
        rules={[
          { required: true, message: '请输入用户名' },
          { whitespace: true, message: '用户名不能全为空格' },
          { max: 64, message: '用户名不能超过64位' },
        ]}
      />
      {!isEdit && (
        <ProFormText.Password
          name="password"
          label="密码"
          placeholder="请输入密码"
          rules={[
            { required: true },
            { min: MIN_PASSWORD_LENGTH, message: `密码长度至少${MIN_PASSWORD_LENGTH}位` },
          ]}
        />
      )}
      <ProFormText name="name" label="姓名" placeholder="请输入姓名" />
      <ProFormText name="avatar" hidden />
      <div style={{ marginBottom: 24 }}>
        <AvatarUpload
          value={avatarUrl}
          label="头像"
          onUpload={handleAvatarUpload}
          onChange={handleAvatarChange}
        />
      </div>
      <ProFormSelect
        name="role_ids"
        label="角色"
        mode="multiple"
        request={async () => {
          const res = await getAllAdminRoles();
          return (res.data || []).map((r: any) => ({ label: r.name, value: r.id }));
        }}
      />
      <ProFormSwitch name="enabled" label="状态" initialValue={true} />
      {isEdit && (
        <ProFormText.Password
          name="password"
          label="新密码"
          placeholder="不修改请留空"
          rules={[{ min: MIN_PASSWORD_LENGTH, message: `密码长度至少${MIN_PASSWORD_LENGTH}位` }]}
        />
      )}
    </>
  );
};

export default function AdminUserList() {
  return (
    <CrudTable<AdminUser>
      title="用户"
      permissionPrefix="system:admin_user"
      service={userService}
      columns={columns}
      formContent={<FormContent />}
      recordToValues={(r) => ({
        username: r.username,
        name: r.name,
        enabled: r.enabled,
        role_ids: r.roles?.map((role) => role.id),
      })}
      transformParams={(params) => ({
        ...params,
        role_ids: Array.isArray(params.role_ids) ? params.role_ids.join(',') : params.role_ids,
        enabled: params.enabled === 'true' ? true : params.enabled === 'false' ? false : undefined,
      })}
    />
  );
}
