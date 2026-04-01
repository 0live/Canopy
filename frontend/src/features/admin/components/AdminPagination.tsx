import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  isFetching: boolean;
  onPageChange: (page: number) => void;
}

export function AdminPagination({
  page,
  pageSize,
  total,
  isFetching,
  onPageChange,
}: AdminPaginationProps) {
  const { t } = useTranslation();
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>{t("admin.pagination.showing", { from, to, total })}</span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0 || isFetching}
          onClick={() => onPageChange(page - 1)}
        >
          {t("admin.pagination.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages - 1 || isFetching}
          onClick={() => onPageChange(page + 1)}
        >
          {t("admin.pagination.next")}
        </Button>
      </div>
    </div>
  );
}
