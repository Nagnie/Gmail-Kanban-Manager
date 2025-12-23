import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ColumnModalsProps {
  // Add Column
  showAddModal: boolean;
  onCloseAddModal: () => void;
  newColumnName: string;
  onChangeColumnName: (name: string) => void;
  onCreateColumn: () => void;

  // Rename Column
  showRenameModal: boolean;
  onCloseRenameModal: () => void;
  renameColumnName: string;
  onChangeRenameColumnName: (name: string) => void;
  onRenameColumn: () => void;

  // Delete Column
  showDeleteModal: boolean;
  onCloseDeleteModal: () => void;
  onDeleteColumn: () => void;

  // Reorder Columns
  showReorderModal: boolean;
  onCloseReorderModal: () => void;
  reorderList: Array<{ id: number; order: number }>;
  onUpdateReorderList: (list: Array<{ id: number; order: number }>) => void;
  onSaveReorder: () => void;

  columnsConfig: any;
}

export const ColumnModals = ({
  showAddModal,
  onCloseAddModal,
  newColumnName,
  onChangeColumnName,
  onCreateColumn,
  showRenameModal,
  onCloseRenameModal,
  renameColumnName,
  onChangeRenameColumnName,
  onRenameColumn,
  showDeleteModal,
  onCloseDeleteModal,
  onDeleteColumn,
  showReorderModal,
  onCloseReorderModal,
  reorderList,
  onUpdateReorderList,
  onSaveReorder,
  columnsConfig,
}: ColumnModalsProps) => {
  return (
    <>
      {/* Add Column Modal */}
      <Dialog open={showAddModal} onOpenChange={onCloseAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>Create a new kanban column.</DialogDescription>
          </DialogHeader>
          <div className='space-y-2'>
            <Input
              placeholder='Column name'
              value={newColumnName}
              onChange={(e) => onChangeColumnName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant='ghost' onClick={onCloseAddModal}>
              Cancel
            </Button>
            <Button onClick={onCreateColumn}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Column Modal */}
      <Dialog open={showRenameModal} onOpenChange={onCloseRenameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Column</DialogTitle>
          </DialogHeader>
          <div className='space-y-2'>
            <Input
              placeholder='New column name'
              value={renameColumnName}
              onChange={(e) => onChangeRenameColumnName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant='ghost' onClick={onCloseRenameModal}>
              Cancel
            </Button>
            <Button onClick={onRenameColumn}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Column Modal */}
      <Dialog open={showDeleteModal} onOpenChange={onCloseDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Column</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this column? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='ghost' onClick={onCloseDeleteModal}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={onDeleteColumn}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reorder Columns Modal */}
      <Dialog open={showReorderModal} onOpenChange={onCloseReorderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reorder Columns</DialogTitle>
            <DialogDescription>
              Adjust display order for columns and save.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2 max-h-60 overflow-auto'>
            {reorderList.map((r, idx) => (
              <div key={`${r.id}-${idx}`} className='flex items-center gap-2'>
                <div className='w-36'>
                  {columnsConfig?.columns?.[r.id]?.name || r.id}
                </div>
                <input
                  type='number'
                  className='w-20 border rounded px-2 py-1'
                  value={r.order}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    onUpdateReorderList(
                      reorderList.map((p) =>
                        p.id === r.id ? { ...p, order: val } : p
                      )
                    );
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant='ghost' onClick={onCloseReorderModal}>
              Cancel
            </Button>
            <Button onClick={onSaveReorder}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
    );
};