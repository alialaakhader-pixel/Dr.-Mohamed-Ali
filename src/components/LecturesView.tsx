import React, { useState } from 'react';
import { BookOpen, Lock, PlayCircle, ClipboardCheck, FileQuestion, CheckCircle2, Clock3, Layers3, Sparkles } from 'lucide-react';
import { Lesson, StudentUser, SubjectType } from '../types';
import { VideoPlayerView } from './VideoPlayerView';

interface Props {
  lessons: Lesson[];
  selectedLessonId: string;
  onSelectLesson: (id: string) => void;
  currentStudent: StudentUser | null;
  onOpenLoginModal: () => void;
  onSaveQuizScore?: (lessonId: string, score: number, total: number) => void;
  onMarkLessonCompleted?: (lessonId: string) => void;
  onWatchProgress?: (lessonId: string, deltaSeconds: number, position: number, duration: number) => void;
  onOpenTeacherUpload?: () => void;
  onOpenAssignments: () => void;
  onOpenExams: () => void;
}

export const LecturesView: React.FC<Props> = ({
  lessons, selectedLessonId, onSelectLesson, currentStudent, onOpenLoginModal,
  onSaveQuizScore, onMarkLessonCompleted, onWatchProgress, onOpenTeacherUpload,
  onOpenAssignments, onOpenExams
}) => {
  const ordered = lessons.filter(l => !currentStudent || l.grade === currentStudent.grade || currentStudent.grade === 'بكالوريا' && l.grade === '3ث');
  const [subjectFilter, setSubjectFilter] = useState<'all' | SubjectType>('all');
  const subjects = Array.from(new Set(ordered.map(l => l.subject || 'biology')));
  const filtered = subjectFilter === 'all' ? ordered : ordered.filter(l => (l.subject || 'biology') === subjectFilter);
  const subjectNames: Record<SubjectType, string> = { biology: 'الأحياء', geology: 'الجيولوجيا', integrated_science: 'العلوم المتكاملة' };
  const chapters = Array.from(new Set(filtered.map(l => l.chapter?.trim() || 'محاضرات عامة')));
  const available = filtered.filter(l => !l.locked);
  const selected = filtered.find(l => l.id === selectedLessonId && !l.locked) || available[0] || null;
  const completed = (l: Lesson) => !!currentStudent?.completedLessonIds?.includes(l.id) ||
    !!currentStudent?.watchHistory?.some(w => w.lessonId === l.id && w.completed);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 text-white" dir="rtl">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-[#082f2b] via-[#0b282b] to-[#10243b] p-6 sm:p-9 shadow-2xl">
        <div className="absolute -left-12 -top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -right-12 -bottom-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-bold text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" /> رحلة تعلم منظمة خطوة بخطوة
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">المحاضرات</h1>
            <p className="mt-3 text-sm sm:text-base leading-7 text-slate-300">
              ذاكر كل محاضرة بالترتيب، سلّم واجبها، واجتز امتحانها بأكثر من 50٪ لفتح المحاضرة التالية.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
              <div className="text-2xl font-black text-emerald-300 tabular-nums">{available.length}</div>
              <div className="mt-1 text-[11px] text-slate-300">محاضرة متاحة</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
              <div className="text-2xl font-black text-cyan-300 tabular-nums">{ordered.length}</div>
              <div className="mt-1 text-[11px] text-slate-300">إجمالي المحاضرات</div>
            </div>
          </div>
        </div>
        <div className="relative mt-7 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full bg-emerald-400/10 border border-emerald-300/20 px-3 py-1.5 text-emerald-200">١ · شاهد المحاضرة</span>
          <span className="rounded-full bg-cyan-400/10 border border-cyan-300/20 px-3 py-1.5 text-cyan-200">٢ · سلّم الواجب</span>
          <span className="rounded-full bg-sky-400/10 border border-sky-300/20 px-3 py-1.5 text-sky-200">٣ · اجتز الامتحان بأكثر من 50٪</span>
          <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-slate-300">٤ · افتح التالية</span>
        </div>
      </section>

      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-2" aria-label="تصفية المحاضرات حسب المادة">
          <button onClick={() => setSubjectFilter('all')} className={'rounded-xl px-4 py-2 text-xs font-black border transition ' + (subjectFilter === 'all' ? 'bg-emerald-400 text-slate-950 border-emerald-300' : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-emerald-400/50')}>كل المواد</button>
          {subjects.map(subjectKey => (
            <button key={subjectKey} onClick={() => setSubjectFilter(subjectKey)} className={'rounded-xl px-4 py-2 text-xs font-black border transition ' + (subjectFilter === subjectKey ? 'bg-emerald-400 text-slate-950 border-emerald-300' : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-emerald-400/50')}>
              {subjectNames[subjectKey]}
            </button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-emerald-400" />
          <h2 className="mt-4 text-lg font-black">لا توجد محاضرات منشورة حتى الآن</h2>
          <p className="mt-2 text-sm text-slate-400">ستظهر محاضرات مرحلتك هنا فور نشرها.</p>
          {!currentStudent && <button onClick={onOpenLoginModal} className="mt-5 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-slate-950">تسجيل دخول الطالب</button>}
        </div>
      ) : (
        <div className="space-y-7">
          {chapters.map((chapter, chapterIndex) => {
            const items = filtered.filter(l => (l.chapter?.trim() || 'محاضرات عامة') === chapter);
            return (
              <section key={chapter} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"><Layers3 className="h-5 w-5" /></div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-emerald-300/80">المجموعة {String(chapterIndex + 1).padStart(2, '0')}</div>
                    <h2 className="text-lg font-black">{chapter}</h2>
                  </div>
                  <div className="mr-auto text-[11px] text-slate-500">{items.filter(x => !x.locked).length} من {items.length} متاحة</div>
                </div>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((item, index) => {
                    const isLocked = !!item.locked;
                    const isDone = completed(item);
                    const isSelected = selected?.id === item.id;
                    return (
                      <article key={item.id} className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${isLocked ? 'border-slate-800 bg-slate-900/50 opacity-80' : isSelected ? 'border-emerald-400/50 bg-gradient-to-br from-emerald-950/70 to-slate-900 shadow-lg shadow-emerald-950/30' : 'border-slate-800 bg-slate-900/80 hover:border-emerald-400/40 hover:-translate-y-0.5'}`}>
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-emerald-400 via-cyan-400 to-sky-500 opacity-70" />
                        <div className="flex items-start justify-between gap-3 pt-1">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isLocked ? 'bg-slate-800 text-slate-500' : 'bg-emerald-400/10 text-emerald-300'}`}>
                            {isLocked ? <Lock className="h-5 w-5" /> : isDone ? <CheckCircle2 className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isLocked ? 'bg-slate-800 text-slate-400' : isDone ? 'bg-emerald-400/10 text-emerald-300' : 'bg-cyan-400/10 text-cyan-200'}`}>
                            {isLocked ? 'مقفولة' : isDone ? 'مكتملة' : 'متاحة الآن'}
                          </span>
                        </div>
                        <div className="mt-4">
                          <div className="text-[10px] text-slate-500">محاضرة {index + 1} · {item.grade} · {subjectNames[item.subject || "biology"]}</div>
                          <h3 className="mt-1 text-base font-black leading-6">{item.title}</h3>
                          <p className="mt-2 min-h-[40px] text-xs leading-5 text-slate-400 line-clamp-2">{item.description || item.unit}</p>
                        </div>
                        {isLocked && (
                          <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] p-3 text-[11px] leading-5 text-amber-100/80">
                            {item.lockedReason === 'SUBSCRIPTION' ? 'هذه المحاضرة تحتاج إلى تفعيل الاشتراك.' : 'تُفتح بعد تسليم واجب المحاضرة السابقة واجتياز امتحانها بأكثر من 50٪.'}
                          </div>
                        )}
                        {!isLocked && (
                          <>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button onClick={() => onSelectLesson(item.id)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-emerald-400 to-cyan-400 px-3 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-emerald-950/30 hover:brightness-110">
                                <PlayCircle className="h-4 w-4" /> {isSelected ? 'المحاضرة مفتوحة' : 'ابدأ المحاضرة'}
                              </button>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {item.assignmentId ? (
                                <button onClick={onOpenAssignments} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-2 text-[10px] font-bold text-cyan-200 hover:bg-cyan-400/10">
                                  <ClipboardCheck className="h-3.5 w-3.5" /> واجب المحاضرة
                                </button>
                              ) : (
                                <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-2 text-center text-[10px] text-slate-500">الواجب لم يُنشر بعد</div>
                              )}
                              {item.examId ? (
                                <button onClick={onOpenExams} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-400/20 bg-sky-400/[0.06] px-2 py-2 text-[10px] font-bold text-sky-200 hover:bg-sky-400/10">
                                  <FileQuestion className="h-3.5 w-3.5" /> امتحان المحاضرة
                                </button>
                              ) : (
                                <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-2 text-center text-[10px] text-slate-500">الامتحان لم يُنشر بعد</div>
                              )}
                            </div>
                          </>
                        )}
                        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500"><Clock3 className="h-3 w-3" /> {item.duration || 'مدة المحاضرة غير محددة'}</div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selected && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold text-emerald-300">المحاضرة المختارة</div>
              <h2 className="text-lg font-black">{selected.title}</h2>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-200">محتوى المحاضرة</span>
          </div>
          <VideoPlayerView
            lesson={selected}
            allLessons={ordered.filter(l => !l.locked)}
            onSelectLesson={onSelectLesson}
            currentStudent={currentStudent}
            onOpenLoginModal={onOpenLoginModal}
            onSaveQuizScore={onSaveQuizScore}
            onMarkLessonCompleted={onMarkLessonCompleted}
            onWatchProgress={onWatchProgress}
            onOpenTeacherUpload={onOpenTeacherUpload}
          />
        </section>
      )}
    </div>
  );
};
