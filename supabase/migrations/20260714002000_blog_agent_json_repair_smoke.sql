-- Reserved migration version for the completed production JSON-repair smoke
-- test. The live request was removed after verification so replaying migration
-- history in another environment cannot trigger an external article run.
SELECT true;
