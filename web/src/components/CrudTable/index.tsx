import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns, ProTableProps } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tooltip } from 'antd';
import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useAccess } from '@umijs/max';
import PageContainer from '../PageContainer';
import { transformTableParams, transformTableResponse } from '@/utils/table';
import type { TablePaginationConfig } from 'antd';
import CrudModal from '../CrudModal';

const DEFAULT_PAGINATION: TablePaginationConfig = {
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  defaultPageSize: 10,
};

type CrudService<T> = {
  list: (params?: any) => Promise<API.Response<T[]> & { total?: number }>;
  create?: (data: any) => Promise<API.Response<T>>;
  update?: (id: number, data: any) => Promise<API.Response<T>>;
  delete?: (id: number) => Promise<API.Response<null>>;
  deleteBatch?: (ids: number[]) => Promise<API.Response<null>>;
};

export interface CrudTableProps<T extends { id: number }> {
  /** 模块名称，如 "用户" */
  title: string;
  /** 权限前缀，如 "system:admin_user"，会自动生成 :list/:create/:edit/:delete */
  permissionPrefix: string;
  /** CRUD 服务 */
  service: CrudService<T>;
  /** 列配置（不含操作列） */
  columns: ProColumns<T>[];
  /** 弹窗表单内容 */
  formContent: React.ReactNode;
  /** 将记录转换为表单初始值 */
  recordToValues?: (record: T) => any;
  /** 自定义请求参数转换 */
  transformParams?: (params: any) => any;
  /** 表格 rowKey，默认 "id" */
  rowKey?: string;
  /** 表格横向滚动宽度 */
  scrollX?: number;
  /** 自定义操作列渲染 */
  renderActions?: (record: T, defaultActions: React.ReactNode) => React.ReactNode;
  /** 返回默认操作的禁用原因；未返回时保持可用 */
  getActionDisabledReason?: (record: T, action: 'edit' | 'delete') => string | undefined;
  /** 操作列宽度，默认 150 */
  actionColumnWidth?: number;
  /** 额外的工具栏按钮 */
  toolBarExtra?: React.ReactNode[];
  /** 是否显示新建按钮，默认 true */
  showCreate?: boolean;
  /** 是否显示删除确认，默认 true */
  showDeleteConfirm?: boolean;
  /** 表格 actionRef，用于外部控制刷新等 */
  actionRef?: React.MutableRefObject<ActionType | null>;
  /** 判断单行是否允许删除 */
  canDeleteRecord?: (record: T) => boolean;
  /** 批量选择配置 */
  rowSelection?: ProTableProps<T, any>['rowSelection'];
}

function CrudTable<T extends { id: number }>({
  title,
  permissionPrefix,
  service,
  columns,
  formContent,
  recordToValues,
  transformParams,
  rowKey = 'id',
  scrollX = 1200,
  renderActions,
  getActionDisabledReason,
  actionColumnWidth = 150,
  toolBarExtra,
  showCreate = true,
  showDeleteConfirm = true,
  actionRef: externalActionRef,
  canDeleteRecord,
  rowSelection,
}: CrudTableProps<T>) {
  const internalActionRef = useRef<ActionType>(null);
  const actionRef = externalActionRef || internalActionRef;
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<T>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const access = useAccess() as Record<string, boolean>;
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mql);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // 权限 keys
  const perms = useMemo(
    () => ({
      create: `${permissionPrefix}:create`,
      edit: `${permissionPrefix}:edit`,
      delete: `${permissionPrefix}:delete`,
    }),
    [permissionPrefix]
  );

  const handleSuccess = useCallback(() => {
    setModalOpen(false);
    setCurrentRow(undefined);
    actionRef.current?.reload();
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      if (!service.delete) return;
      try {
        const res = await service.delete(id);
        if (res.code === 0) {
          message.success('删除成功');
          actionRef.current?.reload();
        } else {
          message.error(res.msg || '删除失败');
        }
      } catch (error: any) {
        message.error(error.message || '删除失败');
      }
    },
    [service]
  );

  const handleDeleteBatch = useCallback(
    async () => {
      if (!service.deleteBatch || selectedRowKeys.length === 0) return;

      try {
        const ids = selectedRowKeys.map((key) => Number(key)).filter((id) => Number.isFinite(id));
        const res = await service.deleteBatch(ids);
        if (res.code === 0) {
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          actionRef.current?.reload();
        } else {
          message.error(res.msg || '批量删除失败');
        }
      } catch (error: any) {
        message.error(error.message || '批量删除失败');
      }
    },
    [actionRef, selectedRowKeys, service]
  );

  const handleEdit = useCallback((record: T) => {
    setCurrentRow(record);
    setModalOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setCurrentRow(undefined);
    setModalOpen(true);
  }, []);

  // 默认操作列
  const defaultActions = useCallback(
    (record: T) => {
      const editDisabledReason = getActionDisabledReason?.(record, 'edit');
      const deleteDisabledReason = getActionDisabledReason?.(record, 'delete');
      const canDelete = canDeleteRecord?.(record) !== false;

      return (
        <Space>
          {access[perms.edit] && service.update && (
            editDisabledReason ? (
              <Tooltip title={editDisabledReason}>
                <span title={editDisabledReason}>
                  <Button type="link" size="small" disabled style={{ height: 'auto', padding: 0 }}>编辑</Button>
                </span>
              </Tooltip>
            ) : (
              <a onClick={() => handleEdit(record)}>编辑</a>
            )
          )}
          {access[perms.delete] && service.delete && (
            deleteDisabledReason ? (
              <Tooltip title={deleteDisabledReason}>
                <span title={deleteDisabledReason}>
                  <Button type="link" size="small" danger disabled style={{ height: 'auto', padding: 0 }}>删除</Button>
                </span>
              </Tooltip>
            ) : !canDelete ? null : showDeleteConfirm ? (
              <Popconfirm
                title={`确定删除该${title}吗？`}
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <a style={{ color: '#ff4d4f' }}>删除</a>
              </Popconfirm>
            ) : (
              <a style={{ color: '#ff4d4f' }} onClick={() => handleDelete(record.id)}>
                删除
              </a>
            )
          )}
        </Space>
      );
    },
    [
      access,
      perms,
      service,
      title,
      handleDelete,
      handleEdit,
      showDeleteConfirm,
      getActionDisabledReason,
      canDeleteRecord,
    ]
  );

  const mergedRowSelection = useMemo<ProTableProps<T, any>['rowSelection'] | undefined>(() => {
    if (!service.deleteBatch || !access[perms.delete]) {
      return rowSelection;
    }

    const rowSelectionConfig = rowSelection && typeof rowSelection === 'object' ? rowSelection : {};

    return {
      ...rowSelectionConfig,
      selectedRowKeys,
      onChange: (keys, rows, info) => {
        setSelectedRowKeys(keys);
        rowSelectionConfig.onChange?.(keys, rows, info);
      },
    };
  }, [access, perms.delete, rowSelection, selectedRowKeys, service.deleteBatch]);

  // 合并操作列
  const finalColumns: ProColumns<T>[] = useMemo(
    () => [
      ...columns,
      {
        title: '操作',
        valueType: 'option' as const,
        width: actionColumnWidth,
        fixed: isMobile ? false : ('right' as const),
        render: (_: any, record: T) =>
          renderActions ? renderActions(record, defaultActions(record)) : defaultActions(record),
      },
    ],
    [columns, renderActions, defaultActions, isMobile, actionColumnWidth]
  );

  return (
    <PageContainer>
      <ProTable<T>
        actionRef={actionRef}
        rowKey={rowKey}
        search={{ labelWidth: 120 }}
        pagination={DEFAULT_PAGINATION}
        toolBarRender={() => [
          ...(toolBarExtra || []),
          showCreate && access[perms.create] && service.create && (
            <Button type="primary" key="create" icon={<PlusOutlined />} onClick={handleCreate}>
              新建
            </Button>
          ),
        ].filter(Boolean)}
        request={async (params, sort) => {
          const apiParams = transformParams
            ? transformParams(transformTableParams(params, sort))
            : transformTableParams(params, sort);
          const res = await service.list(apiParams);
          return transformTableResponse<T>(res);
        }}
        columns={finalColumns}
        scroll={{ x: scrollX }}
        rowSelection={mergedRowSelection}
        tableAlertOptionRender={() =>
          service.deleteBatch && access[perms.delete] ? (
            <Popconfirm
              title={`确定删除选中的 ${selectedRowKeys.length} 个${title}吗？`}
              onConfirm={handleDeleteBatch}
              okText="确定"
              cancelText="取消"
              disabled={selectedRowKeys.length === 0}
            >
              <a style={{ color: '#ff4d4f' }}>批量删除</a>
            </Popconfirm>
          ) : null
        }
      />

      <CrudModal<T>
        title={title}
        open={modalOpen}
        onOpenChange={(visible) => {
          setModalOpen(visible);
          if (!visible) setCurrentRow(undefined);
        }}
        record={currentRow}
        onCreate={service.create}
        onUpdate={service.update}
        onSuccess={handleSuccess}
        recordToValues={recordToValues}
      >
        {formContent}
      </CrudModal>
    </PageContainer>
  );
}

export default CrudTable;
