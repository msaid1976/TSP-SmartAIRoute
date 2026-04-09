from collections.abc import Generator
from pathlib import Path

import pytest
from app.db.base import Base
from app.db.session import get_db_session
from app.main import app
from app.models import ProblemRecord  # noqa: F401
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


@pytest.fixture
def engine(tmp_path: Path) -> Generator[Engine, None, None]:
    database_path = tmp_path / "smartroute-test.db"
    test_engine = create_engine(
        f"sqlite+pysqlite:///{database_path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=test_engine)
    yield test_engine
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )


@pytest.fixture
def session(session_factory: sessionmaker[Session]) -> Generator[Session, None, None]:
    with session_factory() as test_session:
        yield test_session


@pytest.fixture(autouse=True)
def override_db_dependency(session_factory: sessionmaker[Session]) -> Generator[None, None, None]:
    def _get_test_session() -> Session:
        return session_factory()

    app.dependency_overrides[get_db_session] = _get_test_session
    yield
    app.dependency_overrides.clear()
