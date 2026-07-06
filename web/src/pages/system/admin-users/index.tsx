/**
 * 用户管理 - 使用 CrudTable 重构
 */
import type { ProColumns } from '@ant-design/pro-components';
import { ProFormText, ProFormSwitch, ProFormSelect } from '@ant-design/pro-components';
import { Avatar, Tag, Space, Upload, message, Form } from 'antd';
import type { UploadProps } from 'antd';
import { CameraOutlined, UserOutlined } from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
import { createStyles } from 'antd-style';
import { CrudTable } from '@/components';
import { createCrudService } from '@/services/crud';
import { getAllAdminRoles } from '@/services/system/admin-role';
import { uploadAvatar } from '@/services/auth/profile';

// 类型定义
interface AdminUser {
  id: number;
  username: string;
  name: string;
  avatar: string;
  enabled: boolean;
  is_super_admin: boolean;
  roles?: { id: number; name: string }[];
  created_at: string;
}

// CRUD 服务
const userService = createCrudService<AdminUser>('/admin-users');

const useAvatarStyles = createStyles(() => ({
  avatarWrapper: {
    position: 'relative',
    display: 'inline-block',
    cursor: 'pointer',
    '&:hover .avatar-mask': {
      opacity: 1,
    },
  },
  avatarMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: 80,
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.3s',
    color: '#fff',
    fontSize: 14,
  },
}));

// 列配置
const columns: ProColumns<AdminUser>[] = [
  { title: 'ID', dataIndex: 'id', width: 80, search: false },
  { title: '用户名', dataIndex: 'username', width: 150 },
  {
    title: '头像',
    dataIndex: 'avatar',
    width: 80,
    search: false,
    render: (_, r) => <Avatar src={r.avatar} size={40} />,
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
  const { styles } = useAvatarStyles();
  const isEdit = !!record;
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const form = Form.useFormInstance();

  useEffect(() => {
    setAvatarUrl(record?.avatar || `https://api.dicebear.com/9.x/thumbs/png?seed=${Math.random()}`);
  }, [record]);

  /** 上传头像后同步表单隐藏字段，确保保存用户时提交最新头像地址。 */
  const handleAvatarUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;

    setUploading(true);
    try {
      const response = await uploadAvatar(file as File);
      // 后端返回 URL 时才更新预览和表单值，避免保存一个无效头像地址。
      if (response.code === 0 && response.data?.url) {
        setAvatarUrl(response.data.url);
        form?.setFieldValue('avatar', response.data.url);
        message.success('头像上传成功');
        onSuccess?.(response.data);
        return;
      }

      // 业务失败时交给 Upload 标记为失败，并展示后端错误信息。
      const error = new Error(response.msg || '头像上传失败');
      message.error(error.message);
      onError?.(error);
    } catch (error: any) {
      // 网络或运行时异常无法从业务响应读取，直接提示异常信息。
      message.error(error.message || '头像上传失败');
      onError?.(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <ProFormText name="username" label="用户名" placeholder="请输入用户名" rules={[{ required: true }]} />
      {!isEdit && <ProFormText.Password name="password" label="密码" placeholder="请输入密码" rules={[{ required: true }]} />}
      <ProFormText name="name" label="姓名" placeholder="请输入姓名" />
      <ProFormText name="avatar" hidden />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>头像</div>
        <Upload
          accept="image/*"
          showUploadList={false}
          customRequest={handleAvatarUpload}
          disabled={uploading}
        >
          <div className={styles.avatarWrapper}>
            <Avatar size={80} src={avatarUrl} icon={<UserOutlined />} />
            <div className={`${styles.avatarMask} avatar-mask`}>
              <CameraOutlined style={{ fontSize: 24, marginBottom: 8 }} />
              <span>{uploading ? '上传中...' : '点击上传'}</span>
            </div>
          </div>
        </Upload>
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
      <ProFormSwitch name="enabled" label="状态" initialValue={true} disabled={record?.is_super_admin} />
      {isEdit && <ProFormText.Password name="password" label="新密码" placeholder="不修改请留空" />}
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
      rowSelection={{
        getCheckboxProps: (record) => ({
          disabled: record.is_super_admin,
        }),
      }}
      canDeleteRecord={(record) => !record.is_super_admin}
    />
  );
}
