import { CameraOutlined, EyeOutlined, LoadingOutlined, UserOutlined } from '@ant-design/icons';
import { App, Avatar, Button, Image, Space, Tooltip, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { createStyles } from 'antd-style';
import React, { useCallback, useState } from 'react';

const useStyles = createStyles(({ token }) => ({
  field: {
    display: 'inline-flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: 8,
    fontWeight: 500,
  },
  wrapper: {
    position: 'relative',
    display: 'inline-block',
  },
  trigger: {
    position: 'relative',
    padding: 0,
    overflow: 'hidden',
    cursor: 'pointer',
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: '50%',
    '&:focus-visible': {
      outline: `2px solid ${token.colorPrimary}`,
      outlineOffset: 2,
    },
    '&:disabled': {
      cursor: 'not-allowed',
    },
  },
  mask: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 12,
    background: 'rgba(0, 0, 0, 0.62)',
  },
  previewButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    boxShadow: token.boxShadowTertiary,
  },
  hint: {
    color: token.colorTextSecondary,
    fontSize: 12,
  },
}));

export interface AvatarUploadProps {
  value?: string;
  onUpload: (file: File) => Promise<string>;
  onChange?: (url: string) => void;
  size?: number;
  label?: string;
  hint?: string | false;
  disabled?: boolean;
  successMessage?: string;
}

// AvatarUpload 统一头像选择、上传反馈和大图预览交互。
const AvatarUpload: React.FC<AvatarUploadProps> = ({
  value,
  onUpload,
  onChange,
  size = 80,
  label,
  hint = false,
  disabled = false,
  successMessage = '头像上传成功',
}) => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // handleUpload 将 Ant Design 上传生命周期转换为统一的 URL 回调。
  const handleUpload = useCallback<NonNullable<UploadProps['customRequest']>>(async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const url = await onUpload(file as File);
      if (!url) {
        // 缺少地址时视为上传失败，避免业务表单写入空值。
        throw new Error('上传结果缺少图片地址');
      }
      onChange?.(url);
      message.success(successMessage);
      onSuccess?.({ url });
    } catch (error) {
      const uploadError = error instanceof Error ? error : new Error('头像上传失败');
      message.error(uploadError.message || '头像上传失败');
      onError?.(uploadError);
    } finally {
      setUploading(false);
    }
  }, [message, onChange, onUpload, successMessage]);

  const avatarSize = Math.max(size - 2, 1);
  const maskHeight = Math.max(Math.round(size * 0.28), 28);

  return (
    <div className={styles.field}>
      {label ? <div className={styles.label}>{label}</div> : null}
      <Space direction="vertical" size={8} align="center">
        <div className={styles.wrapper} style={{ width: size, height: size }}>
          <Upload
            accept="image/*"
            disabled={disabled || uploading}
            showUploadList={false}
            customRequest={handleUpload}
          >
            <button
              type="button"
              className={styles.trigger}
              style={{ width: size, height: size }}
              aria-label="更换头像"
              disabled={disabled || uploading}
            >
              <Avatar src={value} alt="当前头像" icon={<UserOutlined />} size={avatarSize} />
              <span className={styles.mask} style={{ height: maskHeight }}>
                {uploading ? <LoadingOutlined /> : <CameraOutlined />}
                <span>{uploading ? '上传中' : '更换'}</span>
              </span>
            </button>
          </Upload>
          <Tooltip title="预览头像">
            <Button
              className={styles.previewButton}
              shape="circle"
              icon={<EyeOutlined />}
              aria-label="预览头像"
              disabled={!value}
              onClick={() => setPreviewOpen(true)}
            />
          </Tooltip>
          {value ? (
            <Image
              src={value}
              alt="头像预览"
              style={{ display: 'none' }}
              preview={{ visible: previewOpen, onVisibleChange: setPreviewOpen }}
            />
          ) : null}
        </div>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </Space>
    </div>
  );
};

export default AvatarUpload;
