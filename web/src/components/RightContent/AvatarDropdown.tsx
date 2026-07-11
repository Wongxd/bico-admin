import {
  LockOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Spin } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { logout } from '@/services/auth';
import { buildLoginUrl, getCurrentPathWithSearch, LOGIN_PATH } from '@/utils/redirect';
import { PasswordModal, ProfileModal } from './AccountSettingsModals';
import HeaderDropdown from '../HeaderDropdown';

export type GlobalHeaderRightProps = {
  menu?: boolean;
  children?: React.ReactNode;
};

export const AvatarName = () => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  return <span style={{ lineHeight: '1' }}>{currentUser?.name}</span>;
};

const useStyles = createStyles(({ token }) => {
  return {
    action: {
      display: 'flex',
      height: '48px',
      marginLeft: 'auto',
      overflow: 'hidden',
      alignItems: 'center',
      padding: '0 8px',
      cursor: 'pointer',
      borderRadius: token.borderRadius,
      '&:hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
  };
});

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({
  menu,
  children,
}) => {
  const [activeModal, setActiveModal] = useState<'profile' | 'password' | null>(null);

  /**
   * 退出登录，并且将当前的 url 保存
   */
  const loginOut = async () => {
    try {
      // 调用后端退出登录接口
      await logout();
    } catch (error) {
      console.error('退出登录失败:', error);
    } finally {
      // 清除本地存储
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      
      // 跳转到登录页
      if (history.location.pathname !== LOGIN_PATH) {
        history.replace(buildLoginUrl(getCurrentPathWithSearch()));
      }
    }
  };
  const { styles } = useStyles();

  const { initialState, setInitialState } = useModel('@@initialState');

  // onMenuClick 根据菜单项打开对应弹窗或退出登录。
  const onMenuClick: MenuProps['onClick'] = (event) => {
    const { key } = event;
    if (key === 'logout') {
      // 退出登录需要先清空界面状态，避免旧用户信息短暂残留。
      flushSync(() => {
        setInitialState((s) => ({ ...s, currentUser: undefined }));
      });
      loginOut();
      return;
    }
    if (key === 'profile' || key === 'password') {
      // 账户设置使用弹窗承载，不再改变当前页面路由。
      setActiveModal(key);
    }
  };

  // handleModalOpenChange 在弹窗关闭时清理当前类型。
  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      // 两个弹窗共享关闭逻辑，确保同一时间只显示一个弹窗。
      setActiveModal(null);
    }
  };

  const loading = (
    <span className={styles.action}>
      <Spin
        size="small"
        style={{
          marginLeft: 8,
          marginRight: 8,
        }}
      />
    </span>
  );

  if (!initialState) {
    return loading;
  }

  const { currentUser } = initialState;

  if (!currentUser || !currentUser.name) {
    return loading;
  }

  const menuItems = [
    ...(menu
      ? [
          {
            key: 'profile',
            icon: <UserOutlined />,
            label: '个人信息',
          },
          {
            key: 'password',
            icon: <LockOutlined />,
            label: '修改密码',
          },
          {
            type: 'divider' as const,
          },
        ]
      : []),
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  return (
    <>
      <HeaderDropdown
        menu={{
          selectedKeys: [],
          onClick: onMenuClick,
          items: menuItems,
        }}
      >
        {children}
      </HeaderDropdown>
      <ProfileModal
        open={activeModal === 'profile'}
        onOpenChange={handleModalOpenChange}
      />
      <PasswordModal
        open={activeModal === 'password'}
        onOpenChange={handleModalOpenChange}
      />
    </>
  );
};
