import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAvailableLabels } from '@/hooks/useKanbanQueries';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect } from 'react';

interface ColumnModalsProps {
  errorMessage?: {
    message: string;
    target: string;
  };
  onErrorMessageChange?: (message: { message: string; target: string }) => void;

  // Add Column
  showAddModal: boolean;
  onCloseAddModal: () => void;
  newColumnName: string;
  newLabelOption: string;
  newLabelId?: string | null;
  newLabelName?: string;
  onChangeLabelOption: (option: string) => void;
  onChangeLabelId?: (labelId: string) => void;
  onChangeLabelName?: (labelName: string) => void;
  onChangeColumnName: (name: string) => void;
  onCreateColumn: () => void;

  // Rename Column
  showRenameModal: boolean;
  onCloseRenameModal: () => void;
  renameColumnName: string;
  onChangeRenameColumnName: (name: string) => void;
  onRenameColumn: () => void;

  // Assign Label
  showAssignLabelModal: boolean;
  onCloseAssignLabelModal: () => void;
  assignLabelOption: string;
  assignLabelId?: string | null;
  onChangeAssignLabelOption: (option: string) => void;
  onChangeAssignLabelId?: (labelId: string) => void;
  onChangeAssignLabelName?: (labelName: string) => void;
  onAssignLabel: () => void;

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
  errorMessage,
  onErrorMessageChange,
  showAddModal,
  onCloseAddModal,
  newColumnName,
  onChangeColumnName,
  newLabelOption,
  onChangeLabelOption,
  newLabelId,
  newLabelName,
  onChangeLabelId,
  onChangeLabelName,
  onCreateColumn,
  showRenameModal,
  onCloseRenameModal,
  renameColumnName,
  onChangeRenameColumnName,
  onRenameColumn,

  showAssignLabelModal,
  onCloseAssignLabelModal,
  assignLabelOption,
  assignLabelId,
  onChangeAssignLabelOption,
  onChangeAssignLabelId,
  onChangeAssignLabelName,
  onAssignLabel,

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
  const {
    data: availableLabels,
  } = useAvailableLabels();
  
  useEffect(() => {
    if (newLabelId) {
      onChangeLabelName?.(availableLabels?.find(label => label.id.toString() === newLabelId)?.name || '');
    }
  }, [
    newLabelId,
    availableLabels,
    onChangeLabelName,
  ])

  useEffect(() => {
    if (assignLabelId) {
      onChangeAssignLabelName?.(availableLabels?.find(label => label.id.toString() === assignLabelId)?.name || '');
    }
  }, [
    assignLabelId,
    availableLabels,
    onChangeAssignLabelName,
  ])


  return (
    <>
      {/* Add Column Modal */}
      <Dialog open={showAddModal} onOpenChange={onCloseAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>Create a new kanban column.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
           <div className='space-y-2'>
              <Input
                placeholder='Column name'
                value={newColumnName}
                onChange={(e) => {
                  onChangeColumnName(e.target.value);
                  if (e.target.value && errorMessage) {
                    onErrorMessageChange?.({ message: "", target: "" });
                  }
                }}
              />
              {errorMessage && errorMessage.target === "newColumnName" && (
                <div className='text-sm text-red-600'>
                  {errorMessage.message}
                </div>
              )}
           </div>
           <div>
              <Label className='mb-2 font-medium text-sm'>Label Option</Label>
              <RadioGroup value={newLabelOption} onValueChange={(value) => {
                onChangeLabelOption(value);
                onChangeLabelId?.("");
                onChangeLabelName?.('');
                if (errorMessage) {
                  onErrorMessageChange?.({ message: "", target: "" });
                }
              }} className='flex'>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="none" id="r1" 
                        onClick={() => onChangeLabelOption("none")}
                      />
                      <Label htmlFor="r1">None</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create new column without mapping to a label</p>
                  </TooltipContent>
                </Tooltip>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3" >
                      <RadioGroupItem value="existing" id="r2" 
                        onClick={() => onChangeLabelOption("existing")}
                      />
                      <Label htmlFor="r2">Existing</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create new column mapped to an existing label</p>
                  </TooltipContent>
                </Tooltip>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3" >
                      <RadioGroupItem value="new" id="r3" 
                        onClick={() => onChangeLabelOption("new")}
                      />
                      <Label htmlFor="r3">New</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create new column and create a new label</p>
                  </TooltipContent>
                </Tooltip>
              </RadioGroup>
           </div>
           {
            newLabelOption === 'existing' && (
               <div>
                <Label className='mb-2 font-medium text-sm'>Select Label</Label>
                <Select value={newLabelId || undefined} onValueChange={(value) => {
                  if (onChangeLabelId) {
                    onChangeLabelId(value);
                    onErrorMessageChange?.({ message: "", target: "" });
                  }
                  }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Labels</SelectLabel>
                      {
                        availableLabels?.map((label) => (
                          <SelectItem key={label.id} value={label.id.toString()} disabled={label.isAssigned}>
                            <div className='flex items-center justify-between'>
                              {label.name}
                              {
                                label.isAssigned && (
                                  <div className='ml-2 text-xs text-red-500 font-medium'>
                                    Assigned
                                  </div>
                                )
                              }
                              <Badge className='ml-2' variant='secondary'>
                                {label.type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      }
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errorMessage && errorMessage.target === "newLabel" && (
                  <div className='text-sm text-red-600 mt-1'>
                    {errorMessage.message}
                  </div>
                )}
           </div>
            )
           }
           {
            newLabelOption === 'new' && (
              <div>
                <Input
                  placeholder='New label name'
                  value={newLabelName || ''}
                  onChange={(e) => {
                    onChangeLabelName?.(e.target.value);
                    if (e.target.value && errorMessage) {
                      onErrorMessageChange?.({ message: "", target: "" });
                    }
                  }}
                />
                {errorMessage && errorMessage.target === "newLabel" && (
                  <div className='text-sm text-red-600 mt-1'>
                    {errorMessage.message}
                  </div>
                )}
              </div>
            )
           }
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

      {/* Assign Label Modal */}
      <Dialog open={showAssignLabelModal} onOpenChange={onCloseAssignLabelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Label</DialogTitle>
            <DialogDescription>Assign a label to the column.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
           <div>
              <Label className='mb-2 font-medium text-sm'>Label Option</Label>
              <RadioGroup value={assignLabelOption} onValueChange={(value) => {
                onChangeAssignLabelOption(value);
                onChangeAssignLabelId?.("");
                onChangeAssignLabelName?.('');
                if (errorMessage) {
                  onErrorMessageChange?.({ message: "", target: "" });
                }
              }} className='flex'>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="none" id="r1" 
                        onClick={() => {
                          onChangeAssignLabelOption("none");
                        }}
                      />
                      <Label htmlFor="r1">None</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create new column without mapping to a label</p>
                  </TooltipContent>
                </Tooltip>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3" >
                      <RadioGroupItem value="existing" id="r2" 
                        onClick={() => {
                          onChangeAssignLabelOption("existing");
                        }}
                      />
                      <Label htmlFor="r2">Existing</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create new column mapped to an existing label</p>
                  </TooltipContent>
                </Tooltip>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3" >
                      <RadioGroupItem value="new" id="r3" 
                        onClick={() => {
                          onChangeAssignLabelOption("new");
                        }}
                      />
                      <Label htmlFor="r3">New</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create new column and create a new label</p>
                  </TooltipContent>
                </Tooltip>
              </RadioGroup>
           </div>
           {
            assignLabelOption === 'existing' && (
               <div>
                <Label className='mb-2 font-medium text-sm'>Select Label</Label>
                <Select value={assignLabelId || undefined} onValueChange={(value) => {
                      if (onChangeAssignLabelId) {
                        onChangeAssignLabelId(value);
                        onErrorMessageChange?.({ message: "", target: "" });
                      }
                    }
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Labels</SelectLabel>
                      {
                        availableLabels?.map((label) => (
                          <SelectItem key={label.id} value={label.id.toString()} disabled={label.isAssigned}>
                            <div className='flex items-center justify-between'>
                              {label.name}
                              {
                                label.isAssigned && (
                                  <div className='ml-2 text-xs text-red-500 font-medium'>
                                    Assigned
                                  </div>
                                )
                              }
                              <Badge className='ml-2' variant='secondary'>
                                {label.type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      }
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errorMessage && errorMessage.target === "assignLabel" && (
                  <div className='text-sm text-red-600 mt-1'>
                    {errorMessage.message}
                  </div>
                )}
           </div>
            )
           }
           {
            assignLabelOption === 'new' && (
              <div>
                <Input
                  placeholder='New label name'
                  value={newLabelName || ''}
                  onChange={(e) => {
                    onChangeLabelName?.(e.target.value);
                    if (e.target.value && errorMessage) {
                      onErrorMessageChange?.({ message: "", target: "" });
                    }
                  }}
                />
                {errorMessage && errorMessage.target === "assignLabel" && (
                  <div className='text-sm text-red-600 mt-1'>
                    {errorMessage.message}
                  </div>
                )}
              </div>
            )
           }
          </div>
          <DialogFooter>
            <Button variant='ghost' onClick={onCloseAssignLabelModal}>
              Cancel
            </Button>
            <Button onClick={onAssignLabel}>Assign</Button>
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